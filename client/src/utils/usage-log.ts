/**
 * The usage log (liquidjava.usageLog): one JSON line per use of the LiquidJava view, for user studies.
 * This module is the pure part, so it can be tested without VS Code; services/usage-log.ts writes the file.
 */

/** A message the webview posts when something in the view is used */
export interface UsageMessage {
    type: "usage";
    /** what was used: tab, hints, found-step, state-machine, state-error-step, reveal, context, context-section, copy, scope, diagram */
    action: string;
    [detail: string]: unknown;
}

/** What one line of the log holds */
export interface UsageEvent {
    t: string;
    event: string;
    [detail: string]: unknown;
}

export function isUsageMessage(message: unknown): message is UsageMessage {
    return typeof message === "object" && message !== null
        && (message as { type?: unknown }).type === "usage"
        && typeof (message as { action?: unknown }).action === "string";
}

/**
 * The log line for a message from the webview, or null for messages that are not uses of the view.
 * An openFile message (a click on a location in the view) is logged as `location`
 * @param message what the webview posted
 * @param now the time of the event
 */
export function usageEventFor(message: unknown, now: Date = new Date()): UsageEvent | null {
    if (isUsageMessage(message)) {
        const { type: _type, action, ...detail } = message;
        return { t: now.toISOString(), event: action, ...detail };
    }
    if (typeof message === "object" && message !== null && (message as { type?: unknown }).type === "openFile") {
        const { filePath, line, character } = message as { filePath?: unknown; line?: unknown; character?: unknown };
        return { t: now.toISOString(), event: "location", file: filePath, line, character };
    }
    return null;
}

/** The line appended to the file: JSON and a newline */
export function formatUsageLine(event: UsageEvent): string {
    return JSON.stringify(event) + "\n";
}
