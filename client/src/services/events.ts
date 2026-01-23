import * as vscode from 'vscode';
import { extension } from '../state';
import { updateStateMachine } from './webview';

/**
 * Initializes file system event listeners
 * @param context The extension context
 */
export function registerEvents(context: vscode.ExtensionContext) {
    // listen for active text editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor || editor.document.languageId !== "java") return;
            onActiveFileChange(editor);
            
        }),
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.uri.scheme !== 'file' || document.languageId !== "java") return;
            updateStateMachine(document)
        })
    );
}

/**
 * Handles active file change events
 * @param editor The active text editor
 */
export function onActiveFileChange(editor: vscode.TextEditor) {
    extension.file = editor.document.uri.fsPath;
    extension.webview?.sendMessage({ type: "file", file: extension.file });
    updateStateMachine(editor.document);
}