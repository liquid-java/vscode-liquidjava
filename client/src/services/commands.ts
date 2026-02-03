import * as vscode from "vscode";
import { startExtension, stopExtension, restartExtension } from "../extension";
import { verify } from "./diagnostics";

const commandIcons: Record<string, string> = {
    "liquidjava.showLogs": "$(output)",
    "liquidjava.showView": "$(window)",
    "liquidjava.start": "$(play)",
    "liquidjava.stop": "$(debug-stop)",
    "liquidjava.restart": "$(debug-restart)",
    "liquidjava.verify": "$(check)",
}

const commandHandlers: Record<string, (context: vscode.ExtensionContext) => Promise<void>> = {
    "liquidjava.start": async (context) => await startExtension(context),
    "liquidjava.stop": async () => await stopExtension(),
    "liquidjava.restart": async (context) => await restartExtension(context),
    "liquidjava.verify": async () => await verify(),
}

/**
 * Registers all commands for the LiquidJava extension
 * @param context The extension context
 */
export function registerCommands(context: vscode.ExtensionContext) {
    const packageJson = context.extension.packageJSON;
    const commands = (packageJson.contributes?.commands || []) as vscode.Command[];

    // register commands
    commands.forEach(cmd => {
        const handler = commandHandlers[cmd.command];
        if (handler) {
            context.subscriptions.push(
                vscode.commands.registerCommand(cmd.command, () => handler(context))
            );
        }
    });

    // register command to show all commands
    context.subscriptions.push(
        vscode.commands.registerCommand("liquidjava.showCommands", async () => {
            const quickPickItems = commands
                .filter(cmd => cmd.command !== "liquidjava.showCommands")
                .map(cmd => ({
                    label: `${commandIcons[cmd.command] || "$(symbol-misc)"} ${cmd.title}`,
                    command: cmd.command,
                }));
            
            const placeHolder = "Select a LiquidJava Command";
            const selected = await vscode.window.showQuickPick(quickPickItems, { placeHolder });
            if (selected) vscode.commands.executeCommand(selected.command);
        })
    );    
}