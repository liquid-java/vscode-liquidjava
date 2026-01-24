import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, State } from 'vscode-languageclient/node';
import { connectToPort } from '../utils/utils';
import { killProcess } from '../utils/utils';
import { extension } from '../state';
import { updateStatusBar } from '../services/status-bar';
import { handleLJDiagnostics } from '../services/webview';
import { onActiveFileChange } from '../services/events';
import type { LJDiagnostic } from "../types/diagnostics";

/**
 * Starts the client and connects it to the language server
 * @param context The extension context
 * @param port The port number the server is running on
 */
export async function runClient(context: vscode.ExtensionContext, port: number) {
    const serverOptions: ServerOptions = () => {
        return new Promise(async (resolve, reject) => {
            try {
                extension.socket = await connectToPort(port);
                resolve({
                    writer: extension.socket,
                    reader: extension.socket,
                });
            } catch (error) {
                await stopClient("Failed to connect to server");
                reject(error);
            }
        });
    };
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: "java" }],
    };
    extension.client = new LanguageClient("liquidJavaServer", "LiquidJava Server", serverOptions, clientOptions);
    extension.client.onDidChangeState((e) => {
        if (e.newState === State.Stopped) {
            stopClient("Client stopped");
        }
    });
    
    context.subscriptions.push(extension.client); // client teardown
    context.subscriptions.push({
        dispose: () => stopClient("Client was disposed"), // server teardown
    });

    try {
        await extension.client.start();
        extension.logger.client.info("Extension is ready");
        
        extension.client.onNotification("liquidjava/diagnostics", (diagnostics: LJDiagnostic[]) => {
            handleLJDiagnostics(diagnostics);
        });

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === "java") {
            await onActiveFileChange(editor);
        }
    } catch (e) {
        vscode.window.showErrorMessage("LiquidJava failed to initialize: " + e.toString());
        extension.logger.client.error("Failed to initialize: " + e.toString());
        await stopClient("Failed to initialize");
    }

    // update status bar on file save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            if (extension.client) {
                updateStatusBar("loading");
            }
        })
    );
}

/**
 * Stops the LiquidJava client
 * @param reason The reason for stopping the client
 */
export async function stopClient(reason: string) {
    if (!extension.client && !extension.serverProcess && !extension.socket) {
        extension.logger.client.info("Extension already stopped");
        return;
    }
    extension.logger.client.info("Stopping LiquidJava extension: " + reason);
    updateStatusBar("stopped");

    // stop client
    try {
        await extension.client?.stop();
    } catch (e) {
        extension.logger.client.error("Error stopping client: " + e);
    } finally {
        extension.client = undefined;
    }

    // close socket
    try {
        extension.socket?.destroy();
    } catch (e) {
        extension.logger.client.error("Error closing socket: " + e);
    } finally {
        extension.socket = undefined;
    }

    // kill server process
    await killProcess(extension.serverProcess);
    extension.serverProcess = undefined;
}