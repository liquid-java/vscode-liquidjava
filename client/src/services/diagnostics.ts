import * as vscode from "vscode";
import { extension, ExtensionStatus } from "../state";
import { LJDiagnostic } from "../types/diagnostics";
import { updateStatusBar } from "./status-bar";
import { updateErrorAtCursor } from "./context";
import { refreshCodeLenses } from "./codelens";

/**
 * Handles LiquidJava diagnostics received from the language server
 * @param diagnostics The array of diagnostics received
 */
export function handleLJDiagnostics(diagnostics: LJDiagnostic[]) {
    const containsError = diagnostics.some(d => d.category === "error");
    const statusBarState: ExtensionStatus = containsError ? "failed" : "passed";
    updateStatusBar(statusBarState);
    extension.diagnostics = diagnostics;
    refreshCodeLenses();
    updateErrorAtCursor();
    extension.webview?.sendMessage({ type: "diagnostics", diagnostics });
    if (extension.context)
        extension.webview?.sendMessage({ type: "context", context: extension.context, errorAtCursor: extension.errorAtCursor });
}

/**
 * Handles LiquidJava verifier crashes received from the language server
 */
export function handleLJFailure() {
    extension.diagnostics = [];
    extension.errorAtCursor = undefined;
    refreshCodeLenses();
    extension.webview?.sendMessage({ type: "diagnostics", diagnostics: [] });
    if (extension.context)
        extension.webview?.sendMessage({ type: "context", context: extension.context, errorAtCursor: extension.errorAtCursor });
    updateStatusBar("crashed");
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
