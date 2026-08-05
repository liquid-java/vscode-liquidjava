import * as vscode from "vscode";
import { runClient, stopClient } from "./lsp/client";
import { runLanguageServer, stopLanguageServer } from "./lsp/server";
import { findJavaExecutable } from "./utils/utils";

/**
 * Starts LiquidJava and reports verifier errors as standard VS Code diagnostics.
 */
export async function activate(context: vscode.ExtensionContext) {
    const javaExecutablePath = findJavaExecutable();
    if (!javaExecutablePath) {
        vscode.window.showErrorMessage("LiquidJava - Java Runtime Not Found in JAVA_HOME or PATH");
        return;
    }

    const port = await runLanguageServer(context, javaExecutablePath);
    try {
        await runClient(context, port);
    } catch {
        await stopLanguageServer();
    }
}

/**
 * Stops the language client and server.
 */
export async function deactivate() {
    await stopClient();
    await stopLanguageServer();
}
