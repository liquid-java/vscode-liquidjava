import * as child_process from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { extension } from "../state";
import { DEBUG_MODE, DEBUG_PORT, SERVER_JAR } from "../utils/constants";
import { getAvailablePort, killProcess, normalizeFilePath } from "../utils/utils";

/**
 * Starts the LiquidJava language server.
 */
export async function runLanguageServer(
    context: vscode.ExtensionContext,
    javaExecutablePath: string
): Promise<number> {
    const port = DEBUG_MODE ? DEBUG_PORT : await getAvailablePort();
    if (DEBUG_MODE) return port;

    const jarPath = path.resolve(context.extensionPath, "dist", "server", SERVER_JAR);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const cwd = workspaceFolder ? normalizeFilePath(workspaceFolder.uri.fsPath) : context.extensionPath;
    extension.serverProcess = child_process.spawn(javaExecutablePath, ["-jar", jarPath, port.toString()], {
        cwd,
        stdio: "ignore",
    });
    extension.serverProcess.on("close", () => {
        extension.serverProcess = undefined;
    });
    return port;
}

/**
 * Stops the LiquidJava language server.
 */
export async function stopLanguageServer() {
    await killProcess(extension.serverProcess);
    extension.serverProcess = undefined;
}
