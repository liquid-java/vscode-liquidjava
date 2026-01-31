import * as vscode from "vscode";
import { startExtension, stopExtension, restartExtension } from "../extension";

/**
 * Initializes the command palette for the extension
 * @param context The extension context
 */
export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("liquidjava.showCommands", async () => {
            const commands = [
                { label: "$(output) Show Logs", command: "liquidjava.showLogs" },
                { label: "$(window) Show View", command: "liquidjava.showView" },
                { label: "$(play) Start", command: "liquidjava.start" },
                { label: "$(debug-stop) Stop", command: "liquidjava.stop" },
                { label: "$(debug-restart) Restart", command: "liquidjava.restart" },
            ];
            const placeHolder = "Select a LiquidJava Command";
            const selected = await vscode.window.showQuickPick(commands, { placeHolder });
            if (selected) vscode.commands.executeCommand(selected.command);
        }),
        vscode.commands.registerCommand("liquidjava.start", async () => {
            await startExtension(context);
        }),
        vscode.commands.registerCommand("liquidjava.stop", async () => {
            await stopExtension();
        }),
        vscode.commands.registerCommand("liquidjava.restart", async () => {
            await restartExtension(context);
        })
    );
}