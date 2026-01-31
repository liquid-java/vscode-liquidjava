import * as vscode from 'vscode';
import { extension } from '../state';
import { updateStateMachine } from './state-machine';

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