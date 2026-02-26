import * as vscode from 'vscode';
import { extension } from '../state';
import { updateStateMachine } from './state-machine';
import { Selection } from '../types/context';
import { SELECTION_DEBOUNCE_MS } from '../utils/constants';

let selectionTimeout: NodeJS.Timeout | null = null;
let currentSelection: Selection = { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 };

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
}

/**
 * Handles selection change events
 * @param event The selection change event
 */
export async function onSelectionChange(event: vscode.TextEditorSelectionChangeEvent) {        
    // update current selection
    const selectionStart = event.selections[0].start;
    const selectionEnd = event.selections[0].end;
    currentSelection = {
        startLine: selectionStart.line,
        startColumn: selectionStart.character,
        endLine: selectionEnd.line,
        endColumn: selectionEnd.character
    };
    // debounce selection changes
    if (selectionTimeout) clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => extension.selection = currentSelection, SELECTION_DEBOUNCE_MS);
}