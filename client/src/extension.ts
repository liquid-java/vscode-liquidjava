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
import { runLanguageServer, stopLanguageServer } from "./lsp/server";
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
    await startExtension(context);
}

/**
 * Deactivates the LiquidJava extension
 */
export async function deactivate() {
    extension.logger?.client.info("Deactivating LiquidJava extension...");
    await stopClient("Extension was deactivated");
    await stopLanguageServer();
}

/**
 * Starts the LiquidJava language server and client
 * @param context The extension context
 */
export async function startExtension(context: vscode.ExtensionContext) {
    // check if already running
    if (extension.client || extension.serverProcess) {
        extension.logger.client.info("LiquidJava is already running");
        return;
    }
    extension.logger.client.info("Starting LiquidJava...");

    // find java executable path
    const javaExecutablePath = findJavaExecutable();
    if (!javaExecutablePath) {
        vscode.window.showErrorMessage("LiquidJava - Java Runtime Not Found in JAVA_HOME or PATH");
        extension.logger.client.error("Java Runtime not found in JAVA_HOME or PATH");
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
 * Stops the LiquidJava language server and client
 */
export async function stopExtension() {
    if (!extension.client && !extension.serverProcess) {
        extension.logger?.client.info("LiquidJava is not running");
        return;
    }
    extension.logger?.client.info("Stopping LiquidJava...");
    await stopClient("Extension stop command");
    await stopLanguageServer();
}

/**
 * Restarts the LiquidJava language server and client
 * @param context The extension context
 */
export async function restartExtension(context: vscode.ExtensionContext) {
    extension.logger?.client.info("Restarting LiquidJava...");
    
    // stop if running
    if (extension.client || extension.serverProcess) {
        await stopExtension();
        // ensure clean shutdown
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // start again
    await startExtension(context);
}

