import * as vscode from "vscode";
import { extension } from "../state";
import type { LJVariable, LJContext, LJGhost, LJAlias } from "../types/context";
import { getSimpleName } from "../utils/utils";
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
type CompletionItemKind = "vars" | "ghosts" | "aliases" | "keywords" | "types" | "decls" | "packages";

/**
 * Registers a completion provider for LiquidJava annotations, providing context-aware suggestions based on the current context
 */
export function registerAutocomplete(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider("java", {
            provideCompletionItems(document, position, _token, completionContext) {
                const annotation = getActiveLiquidJavaAnnotation(document, position);
                if (!annotation || !extension.context) return null;

                const isDotTrigger =  completionContext.triggerKind === vscode.CompletionTriggerKind.TriggerCharacter && completionContext.triggerCharacter === ".";
                const receiver = isDotTrigger ? getReceiverBeforeDot(document, position) : null; 
                const file = document.uri.toString().replace("file://", "");
                const nextChar = document.getText(new vscode.Range(position, position.translate(0, 1)));
                const items = getContextCompletionItems(extension.context, file, annotation, nextChar, isDotTrigger, receiver);
                const uniqueItems = new Map<string, vscode.CompletionItem>();
                items.forEach(item => {
                    const label = typeof item.label === "string" ? item.label : item.label.label;
                    if (!uniqueItems.has(label)) uniqueItems.set(label, item);
                });
                return Array.from(uniqueItems.values());
            },
        }, '.', '"')
    );
}

function getContextCompletionItems(context: LJContext, file: string, annotation: LJAnnotation, nextChar: string, isDotTrigger: boolean, receiver: string | null): vscode.CompletionItem[] {
    const triggerParameterHints = nextChar !== "(";
    if (isDotTrigger) {
        if (receiver === "this" || receiver === "old(this)") {
            return getGhostCompletionItems(context.ghosts[file] || [], triggerParameterHints);
        }
        return [];
    } 
    const inScope = extension.context.varsInScope !== null;
    const itemsHandlers: Record<CompletionItemKind, () => vscode.CompletionItem[]> = {
        vars: () => getVariableCompletionItems(extension.context.varsInScope || []),
        ghosts: () => getGhostCompletionItems(context.ghosts[file] || [], triggerParameterHints),
        aliases: () => getAliasCompletionItems(context.aliases, triggerParameterHints),
        keywords: () => getKeywordsCompletionItems(triggerParameterHints, inScope),
        types: () => getTypesCompletionItems(),
        decls: () => getDeclsCompletionItems(),
        packages: () => [], // TODO
    }
    const itemsMap: Record<LJAnnotation, CompletionItemKind[]> = {
        Refinement: ["vars", "ghosts", "aliases", "keywords"],
        StateRefinement: ["vars", "ghosts", "aliases", "keywords"],
        Ghost: ["types"],
        RefinementAlias: ["types"],
        RefinementPredicate: ["types", "decls"],
        StateSet: [],
        ExternalRefinementsFor: ["packages"]
    }
    return itemsMap[annotation].map(key => itemsHandlers[key]()).flat();
}

function getVariableCompletionItems(variables: LJVariable[]): vscode.CompletionItem[] {
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

function getGhostCompletionItems(ghosts: LJGhost[], triggerParameterHints: boolean): vscode.CompletionItem[] {
    return ghosts.map(ghost => {
        const parameters = ghost.parameterTypes.map(getSimpleName).join(", ");
        const ghostSig = `${ghost.returnType} ${ghost.name}(${parameters})`;
        const description = ghost.isState ? "state" : "ghost";
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

function getAliasCompletionItems(aliases: LJAlias[], triggerParameterHints: boolean): vscode.CompletionItem[] {
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
    const oldItem = getOldKeywordCompletionItem(triggerParameterHints);
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

function getOldKeywordCompletionItem(triggerParameterHints: boolean): vscode.CompletionItem {
    return createCompletionItem({
        name: "old",
        kind: vscode.CompletionItemKind.Keyword,
        description: "",
        detail: "keyword",
        documentationBlocks: ["Keyword referring to the **previous state of the current instance**"],
        insertText: triggerParameterHints ? "old($1)" : "old",
        triggerParameterHints,
    });
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

function getReceiverBeforeDot(document: vscode.TextDocument, position: vscode.Position): string | null {
    const prefix = document.lineAt(position.line).text.slice(0, position.character);
    const match = prefix.match(/((?:old\s*\(\s*this\s*\))|(?:[A-Za-z_]\w*))\.\w*$/);
    if (!match) return null;
    const receiver = match[1].trim();
    if (/^old\s*\(\s*this\s*\)$/.test(receiver)) return "old(this)";
    return receiver;
}