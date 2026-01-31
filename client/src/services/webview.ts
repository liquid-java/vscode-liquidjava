import * as vscode from "vscode";
import { LiquidJavaWebviewProvider } from "../webview/provider";
import { extension } from "../state";

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
