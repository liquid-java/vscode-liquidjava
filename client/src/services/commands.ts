import * as vscode from "vscode";
import { extension } from "../state";
import { updateStatusBar } from "./status-bar";

/**
 * Registers the LiquidJava: Verify command, which runs the verifier on the open Java file's project
 */
export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand("liquidjava.verify", verify));
}

async function verify() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "java") {
        vscode.window.showWarningMessage("LiquidJava: No Java file is currently open");
        return;
    }
    if (!extension.client) {
        vscode.window.showWarningMessage("LiquidJava: Extension is not running");
        return;
    }
    updateStatusBar("loading");
    await extension.client.sendNotification("liquidjava/verify", { uri: editor.document.uri.toString() });
}
