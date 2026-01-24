import * as vscode from "vscode";
import { registerLogger } from "./services/logger";
import { applyItalicOverlay } from "./services/decorators";
import { findJavaExecutable } from "./utils/utils";
import { extension } from "./state";
import { registerCommands } from "./services/commands";
import { registerStatusBar, updateStatusBar } from "./services/status-bar";
import { registerWebview } from "./services/webview";
import { registerHover } from "./services/hover";
import { registerEvents } from "./services/events";
import { runLanguageServer } from "./lsp/server";
import { runClient, stopClient } from "./lsp/client";

/**
 * Activates the LiquidJava extension
 * @param context The extension context
 */
export async function activate(context: vscode.ExtensionContext) {
    registerLogger(context);
    registerStatusBar(context);
    registerCommands(context);
    registerWebview(context);
    registerEvents(context);
    registerHover();

    extension.logger.client.info("Activating LiquidJava extension...");
    
    await applyItalicOverlay();

    // find java executable path
    const javaExecutablePath = findJavaExecutable();
    if (!javaExecutablePath) {
        vscode.window.showErrorMessage("LiquidJava - Java Runtime Not Found in JAVA_HOME or PATH");
        extension.logger.client.error("Java Runtime not found in JAVA_HOME or PATH - Not activating extension");
        updateStatusBar("stopped");
        return;
    }
    extension.logger.client.info("Using Java at: " + javaExecutablePath);

    // start server
    extension.logger.client.info("Starting LiquidJava language server...");
    const port = await runLanguageServer(context, javaExecutablePath);

    // start client
    extension.logger.client.info("Starting LiquidJava client...");
    await runClient(context, port);
}

/**
 * Deactivates the LiquidJava extension
 */
export async function deactivate() {
    extension.logger?.client.info("Deactivating LiquidJava extension...");
    await stopClient("Extension was deactivated");
}
