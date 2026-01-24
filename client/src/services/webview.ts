import * as vscode from "vscode";
import { LiquidJavaWebviewProvider } from "../webview/provider";
import { extension } from "../state";
import { StatusBarState, updateStatusBar } from "./status-bar";
import type { StateMachine } from "../types/fsm";
import type { LJDiagnostic } from "../types/diagnostics";

/**
 * Initializes the webview panel for the extension
 * @param context The extension context
 */
export function registerWebview(context: vscode.ExtensionContext) {
    extension.webview = new LiquidJavaWebviewProvider(context.extensionUri);

    // webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(LiquidJavaWebviewProvider.viewType, extension.webview)
    );
    // show view command
    context.subscriptions.push(
        vscode.commands.registerCommand("liquidjava.showView", async () => {
            await vscode.commands.executeCommand("liquidJavaView.focus");
        })
    );
    // listen for messages from the webview
    context.subscriptions.push(
        extension.webview.onDidReceiveMessage(message => {
            console.log("received message", message);
            if (message.type === "ready") {
                extension.webview.sendMessage({ type: "file", file: extension.file });
                extension.webview.sendMessage({ type: "diagnostics", diagnostics: extension.diagnostics });
                if (extension.stateMachine) extension.webview.sendMessage({ type: "fsm", sm: extension.stateMachine });
            }
        })
    );
}


/**
 * Handles LiquidJava diagnostics received from the language server
 * @param diagnostics The array of diagnostics received
 */
export function handleLJDiagnostics(diagnostics: LJDiagnostic[]) {
    const containsError = diagnostics.some(d => d.category === "error");
    const statusBarState: StatusBarState = containsError ? "failed" : "passed";
    updateStatusBar(statusBarState);
    extension.webview?.sendMessage({ type: "diagnostics", diagnostics });
    extension.diagnostics = diagnostics;
}

/**
 * Requests the state machine for the given document from the language server
 * @param document The text document
 */
export async function updateStateMachine(document: vscode.TextDocument) {
    const sm: StateMachine = await extension.client?.sendRequest("liquidjava/fsm", { uri: document.uri.toString() });
    extension.webview?.sendMessage({ type: "fsm", sm });
    extension.stateMachine = sm;
}
