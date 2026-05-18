import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { getAvailablePort, killProcess, normalizeFilePath } from '../utils/utils';
import { extension } from '../state';
import { DEBUG_MODE, DEBUG_PORT, SERVER_JAR } from '../utils/constants';

/**
 * Runs the LiquidJava language server
 * @param context The extension context
 * @param javaExecutablePath The path to the Java executable
 * @returns A promise to the port number the server is running on
 */
export async function runLanguageServer(context: vscode.ExtensionContext, javaExecutablePath: string): Promise<number> {
    const port = DEBUG_MODE ? DEBUG_PORT : await getAvailablePort();
    if (DEBUG_MODE) {
        extension.logger!.client.info("DEBUG MODE: Using fixed port " + port);
        return port;
    }
    extension.logger!.client.info("Running language server on port " + port);

    const jarPath = path.resolve(context.extensionPath, "dist", "server", SERVER_JAR);
    const args = ["-jar", jarPath, port.toString()];
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const options = {
        cwd: workspaceFolder ? normalizeFilePath(workspaceFolder.uri.fsPath) : context.extensionPath, // root path
    };
    extension.logger!.client.info("Creating language server process...");
    extension.serverProcess = child_process.spawn(javaExecutablePath, args, options);

    // listen to process events
    extension.serverProcess.stdout?.on("data", (data) => {
        const message = data.toString().trim();
        extension.logger!.server.info(message);
    });
    extension.serverProcess.stderr?.on("data", (data) => {
        extension.logger!.server.error(data.toString().trim())
    });
    extension.serverProcess.on("error", (err) => {
        extension.logger!.server.error(`Failed to start: ${err}`)
    });
    extension.serverProcess.on("close", (code) => {
        extension.logger!.server.info(`Process exited with code ${code}`);
        extension.serverProcess = undefined;
    });
    return port;
}

/**
 * Stops the LiquidJava language server
 * @returns A promise that resolves when the server is stopped
 */
export async function stopLanguageServer() {
    await killProcess(extension.serverProcess);
    extension.serverProcess = undefined;
}
