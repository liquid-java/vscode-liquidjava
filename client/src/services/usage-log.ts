import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { extension } from "../state";
import { formatUsageLine, usageEventFor, type UsageEvent } from "../utils/usage-log";

const SETTING = "liquidjava.usageLog";

/**
 * Appends what is used in the LiquidJava view to the file named by liquidjava.usageLog (JSON Lines),
 * for user studies. Nothing is written when the setting is empty. A failure to write never reaches the user.
 * @param context The extension context
 */
export function registerUsageLog(context: vscode.ExtensionContext) {
    let file = currentFile();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(SETTING)) file = currentFile();
    }));
    if (extension.webview) {
        context.subscriptions.push(extension.webview.onDidReceiveMessage(message => {
            const event = usageEventFor(message);
            if (event) append(file, event);
        }));
    }
}

/**
 * Logs a use that does not come through the webview, such as the "Show in state machine" code lens
 * @param event what was used
 * @param detail the fields of the line
 */
export function logUsage(event: string, detail: Record<string, unknown> = {}) {
    append(currentFile(), { t: new Date().toISOString(), event, ...detail });
}

function currentFile(): string | null {
    const value = vscode.workspace.getConfiguration().get<string>(SETTING, "").trim();
    return value.length > 0 ? value : null;
}

function append(file: string | null, event: UsageEvent) {
    if (!file) return;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.appendFileSync(file, formatUsageLine(event));
    } catch (error) {
        extension.logger?.client.error(`usage log: cannot write ${file}: ${String(error)}`);
    }
}
