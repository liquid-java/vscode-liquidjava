import * as vscode from "vscode";
import { runClient, stopClient } from "./lsp/client";
import { runLanguageServer, stopLanguageServer } from "./lsp/server";
import { registerCommands } from "./services/commands";
import { registerStatusBar, statusEmitter, updateStatusBar } from "./services/status-bar";
import { findJavaExecutable } from "./utils/utils";
import { ExtensionStatus, extension } from "./state";

/** What activate() returns, for other extensions (the study extension listens for the end of each verification). */
export type LiquidJavaBaselineApi = {
    onStatus: vscode.Event<ExtensionStatus>;
    getStatus: () => ExtensionStatus | undefined;
};

/**
 * Starts LiquidJava and reports verifier errors as standard VS Code diagnostics, with the verifier's
 * messages written as the verifier of July 2025 wrote them (the study baseline).
 */
export async function activate(context: vscode.ExtensionContext): Promise<LiquidJavaBaselineApi> {
    context.subscriptions.push(statusEmitter);
    registerStatusBar(context);
    registerCommands(context);
    const api: LiquidJavaBaselineApi = { onStatus: statusEmitter.event, getStatus: () => extension.status };

    const javaExecutablePath = findJavaExecutable();
    if (!javaExecutablePath) {
        vscode.window.showErrorMessage("LiquidJava - Java Runtime Not Found in JAVA_HOME or PATH");
        updateStatusBar("stopped");
        return api;
    }

    const port = await runLanguageServer(context, javaExecutablePath);
    try {
        await runClient(context, port);
    } catch {
        await stopLanguageServer();
        updateStatusBar("stopped");
    }
    return api;
}

/**
 * Stops the language client and server.
 */
export async function deactivate() {
    await stopClient();
    await stopLanguageServer();
}
