import * as vscode from "vscode";
import { extension } from "../state";
import { LJDiagnostic, RefinementMismatchError } from "../types/diagnostics";
import { StatusBarState, updateStatusBar } from "./status-bar";
import { isPositionBefore, isRangeWithin } from "./context";

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
    if (!extension.file || !extension.currentSelection) return;
    const errors: RefinementMismatchError[] = extension.diagnostics?.filter(d => d.type === 'refinement-error' || d.type === 'state-refinement-error') as RefinementMismatchError[] || [];
    const scopes = extension.context?.fileScopes[extension.file] || [];
    const errorAtCursor = errors.find(error => {
        if (!error.position) return false;
        const sameFile = error.position.file === extension.file;
        const beforeCursor = isPositionBefore(error.position, extension.currentSelection);
        if (!sameFile || !beforeCursor) return false;
        // check if error is within a scope that contains the cursor
        const errorScope = scopes.find(scope => isRangeWithin(error.position, scope));
        return errorScope && isRangeWithin(extension.currentSelection, errorScope);
    });
    extension.errorAtCursor = errorAtCursor;
}