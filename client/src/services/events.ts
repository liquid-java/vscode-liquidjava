import * as vscode from 'vscode';
import { extension } from '../state';
import { updateStateMachine } from './state-machine';
import { SELECTION_DEBOUNCE_MS } from '../utils/constants';
import { normalizeRange, updateContextForSelection } from './context';
import { Range } from '../types/context';

let selectionTimeout: NodeJS.Timeout | null = null;

/**
 * Initializes file system event listeners
 * @param context The extension context
 */
export function registerEvents(context: vscode.ExtensionContext) {
    // listen for active text editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            if (!editor || editor.document.languageId !== "java") return;
            await onActiveFileChange(editor);
        }),
        vscode.workspace.onDidSaveTextDocument(async document => {
            if (document.uri.scheme !== 'file' || document.languageId !== "java") return;
            await updateStateMachine(document)
        }),
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (event.textEditor.document.uri.scheme !== 'file' || event.textEditor.document.languageId !== "java") return;
            if (event.selections.length === 0) return;
            onSelectionChange(event);
        })
    );
}

/**
 * Handles active file change events
 * @param editor The active text editor
 */
export async function onActiveFileChange(editor: vscode.TextEditor) {
    extension.file = editor.document.uri.fsPath;
    extension.webview?.sendMessage({ type: "file", file: extension.file });
    await updateStateMachine(editor.document);
    handleContextUpdate(editor.selection);
}

/**
 * Handles selection change events
 * @param event The selection change event
 */
export async function onSelectionChange(event: vscode.TextEditorSelectionChangeEvent) { 
    // debounce selection changes
    if (selectionTimeout) clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
        handleContextUpdate(event.selections[0]);
    }, SELECTION_DEBOUNCE_MS);
}

/**
 * Updates the current selection and context
 * @param selection The new selection
 */
function handleContextUpdate(selection: vscode.Selection) {
    if (!extension.file || !extension.context) return;
    const range: Range = {
        lineStart: selection.start.line,
        colStart: selection.start.character,
        lineEnd: selection.end.line,
        colEnd: selection.end.character
    };
    const normalizedRange = normalizeRange(range);
    extension.currentSelection = normalizedRange;
    updateContextForSelection(normalizedRange);
    extension.webview?.sendMessage({ type: "context", context: extension.context });
}