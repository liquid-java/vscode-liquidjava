import * as vscode from "vscode";
import { ExtensionStatus, extension } from "../state";

const icons: Record<ExtensionStatus, string> = {
    loading: "$(sync~spin)",
    stopped: "$(circle-slash)",
    passed: "$(check)",
    failed: "$(x)",
    crashed: "$(x)",
};

const statusText: Record<ExtensionStatus, string> = {
    loading: "Loading",
    stopped: "Stopped",
    passed: "Verification passed",
    failed: "Verification failed",
    crashed: "Crashed",
};

/**
 * Shows LiquidJava in the status bar: spinning while it verifies, a check mark when the file passes and a
 * cross when it fails. Clicking it runs the verifier.
 */
export function registerStatusBar(context: vscode.ExtensionContext) {
    extension.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    extension.statusBar.command = "liquidjava.verify";
    updateStatusBar("loading");
    extension.statusBar.show();
    context.subscriptions.push(extension.statusBar);
}

export function updateStatusBar(status: ExtensionStatus) {
    extension.status = status;
    if (!extension.statusBar) return;
    const color = status === "stopped" || status === "crashed" ? "errorForeground" : "statusBar.foreground";
    extension.statusBar.color = new vscode.ThemeColor(color);
    extension.statusBar.text = icons[status] + " LiquidJava";
    extension.statusBar.tooltip = statusText[status];
}
