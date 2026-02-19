import * as vscode from "vscode";
import { extension } from "../state";
import type { Variable, ContextHistory, Ghost, Alias } from "../types/context";
import { LIQUIDJAVA_ANNOTATIONS } from "../utils/constants";
import { getSimpleName } from "../utils/utils";
import { getVariablesInScope } from "./context";

const LIQUIDJAVA_ANNOTATION_START = new RegExp(`@(liquidjava\\.specification\\.)?(${LIQUIDJAVA_ANNOTATIONS.join("|")})\\s*\\(`, "g");

/**
 * Registers a completion provider for LiquidJava annotations, providing context-aware suggestions based on the current context history
 */
export function registerAutocomplete(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider("java", {
            provideCompletionItems(document, position) {
                if (!isInsideLiquidJavaAnnotationString(document, position) || !extension.contextHistory) return null;
                const file = document.uri.toString().replace("file://", "");
                return getContextCompletionItems(extension.contextHistory, file);
            },
        })
    );
}

function getContextCompletionItems(context: ContextHistory, file: string): vscode.CompletionItem[] {
    const variables: Variable[] = [];
    const variablesInScope = getVariablesInScope(file, extension.selection);
    variables.push(...variablesInScope);
    variables.push(...context.instanceVars);
    variables.push(...context.globalVars);

    const variableItems = getVariableCompletionItems(variablesInScope);
    const ghostItems = getGhostCompletionItems(context.ghosts);
    const aliasItems = getAliasCompletionItems(context.aliases);
    const allItems = [...variableItems, ...ghostItems, ...aliasItems];
    
    // remove duplicates
    const uniqueItems = new Map<string, vscode.CompletionItem>();
    allItems.forEach(item => {
        const label = typeof item.label === "string" ? item.label : item.label.label;
        if (!uniqueItems.has(label)) {
            uniqueItems.set(label, item);
        }
    });
    return Array.from(uniqueItems.values());
}

function getVariableCompletionItems(variables: Variable[]): vscode.CompletionItem[] {
    return variables.map(variable => {
        const varSig = `${variable.type} ${variable.name}`;
        const documentationBlocks: string[] = [];
        if (variable.mainRefinement !== "true") documentationBlocks.push(`@Refinement("${variable.mainRefinement}")`);
        documentationBlocks.push(varSig);

        return createCompletionItem({
            name: variable.name,
            kind: vscode.CompletionItemKind.Variable,
            description: variable.type,
            detail: "variable",
            documentationBlocks,
        });
    });
}

function getGhostCompletionItems(ghosts: Ghost[]): vscode.CompletionItem[] {
    return ghosts.map(ghost => {
        const parameters = ghost.parameterTypes.map(getSimpleName).join(", ");
        const parametersStr = `(${parameters})`;
        const ghostSig = `${ghost.returnType} ${ghost.name}${parametersStr}`;
        return createCompletionItem({
            name: ghost.name,
            kind: vscode.CompletionItemKind.Function,
            labelDetail: parametersStr,
            description: ghost.returnType,
            detail: "ghost",
            documentationBlocks: [ghostSig],
            insertText: `${ghost.name}($1)`,
            triggerParameterHints: true,
        });
    });
}

function getAliasCompletionItems(aliases: Alias[]): vscode.CompletionItem[] {
    return aliases.map(alias => {
        const parameters = alias.parameters
            .map((parameter, index) => {
                const type = getSimpleName(alias.types[index]);
                return `${type} ${parameter}`;
            }).join(", ");
        const parametersStr = `(${parameters})`;
        const aliasSig = `${alias.name}${parametersStr} { ${alias.predicate} }`;

        return createCompletionItem({
            name: alias.name,
            kind: vscode.CompletionItemKind.Function,
            labelDetail: parametersStr,
            description: alias.predicate,
            detail: "alias",
            documentationBlocks: [aliasSig],
            insertText: `${alias.name}($1)`,
            triggerParameterHints: true,
        });
    });
}

type CompletionItemOptions = {
    name: string;
    kind: vscode.CompletionItemKind;
    description?: string;
    labelDetail?: string;
    detail: string;
    documentationBlocks: string[];
    insertText?: string;
    triggerParameterHints?: boolean;
}

function createCompletionItem({ name, kind, labelDetail, description, detail, documentationBlocks, insertText, triggerParameterHints }: CompletionItemOptions): vscode.CompletionItem {
    const item = new vscode.CompletionItem(name, kind);
    item.label = { label: name, detail: labelDetail, description };
    item.detail = detail;
    if (insertText) item.insertText = new vscode.SnippetString(insertText);
    if (triggerParameterHints) item.command = { command: "editor.action.triggerParameterHints", title: "Trigger Parameter Hints" };

    const documentation = new vscode.MarkdownString();
    documentationBlocks.forEach(block => documentation.appendCodeblock(block));
    item.documentation = documentation;
    return item;
}

function isInsideLiquidJavaAnnotationString(document: vscode.TextDocument, position: vscode.Position): boolean {
    const textUntilCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    LIQUIDJAVA_ANNOTATION_START.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    let lastAnnotationStart = -1;
    while ((match = LIQUIDJAVA_ANNOTATION_START.exec(textUntilCursor)) !== null) {
        lastAnnotationStart = match.index;
    }
    if (lastAnnotationStart === -1) return false;
    const fromLastAnnotation = textUntilCursor.slice(lastAnnotationStart);
    return !fromLastAnnotation.includes(")");
}