import * as vscode from "vscode";

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
                // TODO: add more commands here, e.g., start, stop, restart, verify, etc.
            ];
            const placeHolder = "Select a LiquidJava Command";
            const selected = await vscode.window.showQuickPick(commands, { placeHolder });
            if (selected) vscode.commands.executeCommand(selected.command);
        })
    );
}