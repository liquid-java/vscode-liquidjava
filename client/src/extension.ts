import * as vscode from "vscode";
import { runClient, stopClient } from "./lsp/client";
import { runLanguageServer, stopLanguageServer } from "./lsp/server";
import { registerCommands } from "./services/commands";
import { registerStatusBar, updateStatusBar } from "./services/status-bar";
import { findJavaExecutable } from "./utils/utils";

/**
 * Starts LiquidJava and reports verifier errors as standard VS Code diagnostics, with the verifier's
 * messages written as the verifier of July 2025 wrote them (the study baseline).
 */
export async function activate(context: vscode.ExtensionContext) {
    registerStatusBar(context);
    registerCommands(context);

    const javaExecutablePath = findJavaExecutable();
    if (!javaExecutablePath) {
        vscode.window.showErrorMessage("LiquidJava - Java Runtime Not Found in JAVA_HOME or PATH");
        updateStatusBar("stopped");
        return;
    }

    const port = await runLanguageServer(context, javaExecutablePath);
    try {
        await runClient(context, port);
    } catch {
        await stopLanguageServer();
        updateStatusBar("stopped");
    }
}

/**
 * Stops the language client and server.
 */
export async function deactivate() {
    await stopClient();
    await stopLanguageServer();
}
