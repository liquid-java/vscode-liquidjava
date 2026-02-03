import * as vscode from "vscode";
import { extension } from "../state";

export type StatusBarState = "loading" | "stopped" | "passed" | "failed";

 const icons = {
    loading: "$(sync~spin)",
    stopped: "$(circle-slash)",
    passed: "$(check)",
    failed: "$(x)",
};

const statusText = {
    loading: "Loading",
    stopped: "Stopped",
    passed: "Verification passed",
    failed: "Verification failed",
};

/**
 * Initializes the status bar for the extension
 * @param context The extension context
 */
export function registerStatusBar(context: vscode.ExtensionContext) {
    extension.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    extension.statusBar.command = "liquidjava.showCommands";
    updateStatusBar("loading");
    extension.statusBar.show();
    context.subscriptions.push(extension.statusBar);
}

/**
 * Updates the status bar with the current state
 * @param state The current state ("loading", "stopped", "passed", "failed")
 */
export function updateStatusBar(state: StatusBarState) {
    const color = state === "stopped" ? "errorForeground" : "statusBar.foreground";
    extension.statusBar.color = new vscode.ThemeColor(color);
    extension.statusBar.text = icons[state] + " LiquidJava";
    extension.statusBar.tooltip = statusText[state];
}