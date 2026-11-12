import * as vscode from "vscode";
import { LiquidJavaWebviewProvider } from "../webview/provider";
import { extension } from "../state";
import type { DiagnosticRevealTarget } from "../types/diagnostics";
import type { NavTab } from "../webview/views/sections";
import { logUsage } from "./usage-log";

/**
 * Initializes the webview panel for the extension
 * @param context The extension context
 */
export function registerWebview(context: vscode.ExtensionContext) {
    extension.webview = new LiquidJavaWebviewProvider(context.extensionUri);
    let pendingDiagnosticReveal: { diagnostic: DiagnosticRevealTarget, tab?: NavTab } | undefined;
    let pendingTab: NavTab | undefined;

    // webview provider
    context.subscriptions.push(
        extension.webview,
        vscode.window.registerWebviewViewProvider(LiquidJavaWebviewProvider.viewType, extension.webview)
    );
    // show view command
    context.subscriptions.push(
        // shows the diagnostic in the Verification tab, or a state error in the State Machine tab when tab is 'fsm';
        // without a diagnostic, opens the tab, if one is given. from names the caller in the usage log: the code
        // lenses above an error (the default), or another extension
        vscode.commands.registerCommand("liquidjava.showView", async (diagnostic?: DiagnosticRevealTarget, tab?: NavTab, from = 'code-lens') => {
            const isVisible = extension.webview?.isVisible();
            await vscode.commands.executeCommand("liquidJavaView.focus");
            if (!diagnostic) {
                if (!tab) return;
                logUsage('tab', { tab, from });
                if (isVisible) extension.webview?.sendMessage({ type: "selectTab", tab });
                else pendingTab = tab;
                return;
            }
            // the code lenses above an error: its title opens the Verification tab, "Show in state machine" the State Machine tab
            logUsage(tab === 'fsm' ? 'state-machine' : 'show-view', { from, file: diagnostic.file, line: diagnostic.position.lineStart + 1 });
            
            if (isVisible) {
                extension.webview?.sendMessage({ type: "revealDiagnostic", diagnostic, tab });
            } else {
                pendingDiagnosticReveal = { diagnostic, tab };
            }
        })
    );
    // listen for messages from the webview
    context.subscriptions.push(
        extension.webview.onDidReceiveMessage(message => {
            if (message.type === "ready") {
                if (extension.file) extension.webview?.sendMessage({ type: "file", file: extension.file });
                if (extension.diagnostics) extension.webview?.sendMessage({ type: "diagnostics", diagnostics: extension.diagnostics });
                if (extension.context) extension.webview?.sendMessage({ type: "context", context: extension.context , errorAtCursor: extension.errorAtCursor });
                if (extension.stateMachines !== undefined) extension.webview?.sendMessage({ type: "fsm", sms: extension.stateMachines });
                if (extension.status) extension.webview?.sendMessage({ type: "status", status: extension.status });
                if (pendingDiagnosticReveal) {
                    extension.webview?.sendMessage({ type: "revealDiagnostic", ...pendingDiagnosticReveal });
                    pendingDiagnosticReveal = undefined;
                }
                if (pendingTab) {
                    extension.webview?.sendMessage({ type: "selectTab", tab: pendingTab });
                    pendingTab = undefined;
                }
            }
        })
    );
}
