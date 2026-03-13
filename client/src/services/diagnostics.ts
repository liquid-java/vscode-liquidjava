import * as vscode from "vscode";
import { extension } from "../state";
import { LJDiagnostic, RefinementMismatchError } from "../types/diagnostics";
import { StatusBarState, updateStatusBar } from "./status-bar";
import { isRangeWithin } from "./context";

/**
 * Handles LiquidJava diagnostics received from the language server
 * @param diagnostics The array of diagnostics received
 */
export function handleLJDiagnostics(diagnostics: LJDiagnostic[]) {
    const containsError = diagnostics.some(d => d.category === "error");
    const statusBarState: StatusBarState = containsError ? "failed" : "passed";
    updateStatusBar(statusBarState);
    extension.diagnostics = diagnostics;
    extension.webview?.sendMessage({ type: "diagnostics", diagnostics });
}

/**
 * Triggers the LiquidJava verification manually
 */
export async function verify() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "java") {
        vscode.window.showWarningMessage("LiquidJava: No Java file is currently open");
        return;
    }
    
    if (!extension.client) {
        vscode.window.showWarningMessage("LiquidJava: Extension is not running. Use 'LiquidJava: Start' first.");
        return;
    }
    
    const uri = editor.document.uri.toString();
    extension.logger?.client.info("Verify command — checking diagnostics");
    updateStatusBar("loading");
    
    extension.client.sendNotification("liquidjava/verify", { uri });
}

export function updateErrorAtCursor() {
    if (!extension.file || !extension.currentSelection || !extension.currentScope) return;
    const errors: RefinementMismatchError[] = extension.diagnostics?.filter(d => d.type === 'refinement-error' || d.type === 'state-refinement-error') as RefinementMismatchError[] || [];
    const errorAtCursor = errors.find(error => {
        if (!error.position) return false;
        const sameFile = error.position.file === extension.file;
        const withinScope = isRangeWithin(error.position, extension.currentScope);
        const afterCursor = extension.currentSelection.lineStart > error.position.lineStart || (error.position.lineStart === extension.currentSelection.lineStart && extension.currentSelection.colStart >= error.position.colStart);
        return sameFile && withinScope && afterCursor;
    });
    extension.errorAtCursor = errorAtCursor;
}