import * as vscode from "vscode";
import { ExtensionStatus, extension } from "../state";

const icons = {
    loading: "$(sync~spin)",
    stopped: "$(circle-slash)",
    passed: "$(check)",
    failed: "$(x)",
    crashed: "$(x)",
};

const statusText = {
    loading: "Loading",
    stopped: "Stopped",
    passed: "Verification passed",
    failed: "Verification failed",
    crashed: "Crashed",
};

/**
 * Initializes the status bar for the extension
 * @param context The extension context
 */
export function registerStatusBar(context: vscode.ExtensionContext) {
    extension.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    extension.statusBar.command = "liquidjava.showCommands";
    updateStatusBar("loading", true);
    extension.statusBar.show();
    context.subscriptions.push(extension.statusBar);
}

/**
 * Updates the status bar with the current state
 * @param status The current status ("loading", "stopped", "passed", "failed", "crashed")
 * @param notifyWebview Whether the webview should reflect this status update.
 */
export function updateStatusBar(status: ExtensionStatus, notifyWebview = status !== "loading") {
    if (notifyWebview) {
        extension.status = status;
        extension.webview?.sendMessage({ type: "status", status });
    }
    const color = status === "stopped" || status === "crashed" ? "errorForeground" : "statusBar.foreground";
    if (!extension.statusBar) return;
    extension.statusBar.color = new vscode.ThemeColor(color);
    extension.statusBar.text = icons[status] + " LiquidJava";
    extension.statusBar.tooltip = statusText[status];
}
