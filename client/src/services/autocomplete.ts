import * as vscode from "vscode";
import { extension } from "../state";
import type { Variable, ContextHistory, Ghost, Alias } from "../types/context";
import { getSimpleName } from "../utils/utils";
import { getVariablesInScope } from "./context";
import { LIQUIDJAVA_ANNOTATION_START, LJAnnotation } from "../utils/constants";

type CompletionItemOptions = {
    name: string;
    kind: vscode.CompletionItemKind;
    description?: string;
    labelDetail?: string;
    detail: string;
    documentationBlocks?: string[];
    codeBlocks?: string[];
    insertText?: string;
    triggerParameterHints?: boolean;
}
type CompletionItemKind = "vars" | "ghosts" | "aliases" | "keywords" | "types" | "decls" | "imports";

/**
 * Registers a completion provider for LiquidJava annotations, providing context-aware suggestions based on the current context history
 */
export function registerAutocomplete(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider("java", {
            provideCompletionItems(document, position) {
                const annotation = getActiveLiquidJavaAnnotation(document, position);
                if (!annotation || !extension.contextHistory) return null;
                const file = document.uri.toString().replace("file://", "");
                const nextChar = document.getText(new vscode.Range(position, position.translate(0, 1)));
                return getContextCompletionItems(extension.contextHistory, file, annotation, nextChar);
            },
        })
    );
}

function getContextCompletionItems(context: ContextHistory, file: string, annotation: LJAnnotation, nextChar: string): vscode.CompletionItem[] {   
    const triggerParameterHints = nextChar !== "(";
    const variablesInScope = getVariablesInScope(file, extension.selection);
    const inScope = variablesInScope !== null;
    const itemsHandlers: Record<CompletionItemKind, () => vscode.CompletionItem[]> = {
        vars: () => getVariableCompletionItems(variablesInScope || []),
        ghosts: () => getGhostCompletionItems(context.ghosts[file] || [], triggerParameterHints),
        aliases: () => getAliasCompletionItems(context.aliases, triggerParameterHints),
        keywords: () => getKeywordsCompletionItems(triggerParameterHints, inScope),
        types: () => getTypesCompletionItems(),
        decls: () => getDeclsCompletionItems(),
        imports: () => [], // TODO: implement imports completion
    }
    const itemsMap: Record<LJAnnotation, CompletionItemKind[]> = {
        Refinement: ["vars", "ghosts", "aliases", "keywords"],
        StateRefinement: ["vars", "ghosts", "aliases", "keywords"],
        Ghost: ["types"],
        RefinementAlias: ["types"],
        RefinementPredicate: ["types", "decls"],
        StateSet: [],
        ExternalRefinementsFor: ["imports"]
    }
    const items: vscode.CompletionItem[] = itemsMap[annotation].map(key => itemsHandlers[key]()).flat();
    const uniqueItems = new Map<string, vscode.CompletionItem>();
    items.forEach(item => {
        const label = typeof item.label === "string" ? item.label : item.label.label;
        if (!uniqueItems.has(label)) uniqueItems.set(label, item);
    });
    return Array.from(uniqueItems.values());
}

function getVariableCompletionItems(variables: Variable[]): vscode.CompletionItem[] {
    return variables.map(variable => {
        const varSig = `${variable.type} ${variable.name}`;
        const codeBlocks: string[] = [];
        if (variable.mainRefinement !== "true") codeBlocks.push(`@Refinement("${variable.mainRefinement}")`);
        codeBlocks.push(varSig);
        return createCompletionItem({
            name: variable.name,
            kind: vscode.CompletionItemKind.Variable,
            description: variable.type,
            detail: "variable",
            codeBlocks,
        });
    });
}

function getGhostCompletionItems(ghosts: Ghost[], triggerParameterHints: boolean): vscode.CompletionItem[] {
    return ghosts.map(ghost => {
        const parameters = ghost.parameterTypes.map(getSimpleName).join(", ");
        const ghostSig = `${ghost.returnType} ${ghost.name}(${parameters})`;
        const isState = /^state\d+\(_\) == \d+$/.test(ghost.refinement);
        const description = isState ? "state" : "ghost";
        return createCompletionItem({
            name: ghost.name,
            kind: vscode.CompletionItemKind.Function,
            labelDetail: `(${parameters})`,
            description,
            detail: description,
            codeBlocks: [ghostSig],
            insertText: triggerParameterHints ? `${ghost.name}($1)` : ghost.name,
            triggerParameterHints,
        });
    });
}

function getAliasCompletionItems(aliases: Alias[], triggerParameterHints: boolean): vscode.CompletionItem[] {
    return aliases.map(alias => {
        const parameters = alias.parameters
            .map((parameter, index) => {
                const type = getSimpleName(alias.types[index]);
                return `${type} ${parameter}`;
            }).join(", ");
        const aliasSig = `${alias.name}(${parameters}) { ${alias.predicate} }`;
        const description = "alias";
        return createCompletionItem({
            name: alias.name,
            kind: vscode.CompletionItemKind.Function,
            labelDetail: `(${parameters}){ ${alias.predicate} }`,
            description,
            detail: description,
            codeBlocks: [aliasSig],
            insertText: triggerParameterHints ? `${alias.name}($1)` : alias.name,
            triggerParameterHints,
        });
    });
}

function getKeywordsCompletionItems(triggerParameterHints: boolean, inScope: boolean): vscode.CompletionItem[] {
    const thisItem = createCompletionItem({
        name: "this",
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
        documentationBlocks: ["Keyword referring to the **current instance**"],
    });
    const oldItem = createCompletionItem({
        name: "old",
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
        documentationBlocks: ["Keyword referring to the **previous state of the current instance**"],
        insertText: triggerParameterHints ? "old($1)" : "old",
        triggerParameterHints,
    });
    const trueItem = createCompletionItem({
        name: "true",
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
    });

    const falseItem = createCompletionItem({
        name: "false",
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
    });
    const items: vscode.CompletionItem[] = [thisItem, oldItem, trueItem, falseItem];
    if (!inScope) {
        const returnItem = createCompletionItem({
            name: "return",
            kind: vscode.CompletionItemKind.Keyword,
            description: "",
            detail: "keyword",
            documentationBlocks: ["Keyword referring to the **method return value**"],
        });
        items.push(returnItem);
    }
    return items;
}

function getTypesCompletionItems(): vscode.CompletionItem[] {
    const types = ["int", "double", "float", "boolean"];
    return types.map(type => createCompletionItem({
        name: type,
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
    }));
}

function getDeclsCompletionItems(): vscode.CompletionItem[] {
    const decls = ["ghost", "type"]
    return decls.map(decl => createCompletionItem({
        name: decl,
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
    }));
}

function createCompletionItem({ name, kind, labelDetail, description, detail, documentationBlocks, codeBlocks, insertText, triggerParameterHints }: CompletionItemOptions): vscode.CompletionItem {
    const item = new vscode.CompletionItem(name, kind);
    item.label = { label: name, detail: labelDetail, description };
    item.detail = detail;
    if (insertText) item.insertText = new vscode.SnippetString(insertText);
    if (triggerParameterHints) item.command = { command: "editor.action.triggerParameterHints", title: "Trigger Parameter Hints" };

    const documentation = new vscode.MarkdownString();
    if (documentationBlocks) documentationBlocks.forEach(block => documentation.appendMarkdown(block));
    if (codeBlocks) codeBlocks.forEach(block => documentation.appendCodeblock(block));  
    item.documentation = documentation;
    
    return item;
}

function getActiveLiquidJavaAnnotation(document: vscode.TextDocument, position: vscode.Position): LJAnnotation | null {
    const textUntilCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    LIQUIDJAVA_ANNOTATION_START.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    let lastAnnotationStart = -1;
    let lastAnnotationName: LJAnnotation | null = null;
    while ((match = LIQUIDJAVA_ANNOTATION_START.exec(textUntilCursor)) !== null) {
        lastAnnotationStart = match.index;
        lastAnnotationName = match[2] as LJAnnotation || null;
    }
    if (lastAnnotationStart === -1 || !lastAnnotationName) return null;

    const fromLastAnnotation = textUntilCursor.slice(lastAnnotationStart);
    let parenthesisDepth = 0;
    let isInsideString = false;
    for (let i = 0; i < fromLastAnnotation.length; i++) {
        const char = fromLastAnnotation[i];
        const previousChar = i > 0 ? fromLastAnnotation[i - 1] : "";
        if (char === '"' && previousChar !== "\\") {
            isInsideString = !isInsideString;
            continue;
        }
        if (isInsideString) continue;
        if (char === "(") parenthesisDepth++;
        if (char === ")") parenthesisDepth--;
    }
    return parenthesisDepth > 0 ? lastAnnotationName : null;
}