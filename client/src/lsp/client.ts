import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { extension } from "../state";
import { connectToPort } from "../utils/utils";

/**
 * Connects the standard language client to the LiquidJava server.
 */
export async function runClient(context: vscode.ExtensionContext, port: number) {
    const serverOptions: ServerOptions = async () => {
        extension.socket = await connectToPort(port);
        return {
            writer: extension.socket,
            reader: extension.socket,
        };
    };
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ language: "java" }],
    };

    extension.client = new LanguageClient("liquidJavaServer", "LiquidJava Server", serverOptions, clientOptions);
    context.subscriptions.push(extension.client);

    try {
        await extension.client.start();
    } catch (error) {
        vscode.window.showErrorMessage("LiquidJava failed to initialize: " + String(error));
        await stopClient();
        throw error;
    }
}

/**
 * Stops the standard language client connection.
 */
export async function stopClient() {
    try {
        await extension.client?.stop();
    } catch {
        // the connection may already be closed
    } finally {
        extension.client = undefined;
        extension.socket?.destroy();
        extension.socket = undefined;
    }
}
