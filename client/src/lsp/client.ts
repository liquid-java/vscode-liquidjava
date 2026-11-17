import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { extension } from "../state";
import { connectToPort } from "../utils/utils";
import { updateStatusBar } from "../services/status-bar";
import { setTranslationTables } from "../services/hover";
import { splitTranslationTable } from "../services/message-table";

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
        middleware: {
            // The translation table at the end of a message is taken out of the plain text and shown rendered in the
            // hover (services/hover.ts): a diagnostic's message is plain text wherever VS Code shows it
            handleDiagnostics(uri, diagnostics, next) {
                const tables: Parameters<typeof setTranslationTables>[1] = [];
                for (const diagnostic of diagnostics) {
                    const { text, table } = splitTranslationTable(diagnostic.message);
                    if (!table) continue;
                    diagnostic.message = text;
                    tables.push({ range: diagnostic.range, table });
                }
                setTranslationTables(uri, tables);
                next(uri, diagnostics);
            },
        },
    };

    extension.client = new LanguageClient("liquidJavaServer", "LiquidJava Server", serverOptions, clientOptions);
    context.subscriptions.push(extension.client);

    try {
        await extension.client.start();
        extension.client.onNotification("liquidjava/status", (params: { status: "loading" | "passed" | "failed" | "crashed" }) =>
            updateStatusBar(params.status)
        );
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
        updateStatusBar("stopped");
        extension.client = undefined;
        extension.socket?.destroy();
        extension.socket = undefined;
    }
}
