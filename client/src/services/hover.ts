import * as vscode from "vscode";
import { formatTableMarkdown, type TranslationTable } from "./message-table";

type TableAt = { range: vscode.Range; table: TranslationTable };

// the translation tables taken out of the diagnostics of each file, by the file's uri
const tables = new Map<string, TableAt[]>();

/** Remembers the tables of a file's diagnostics, for the hover; called by the diagnostics middleware */
export function setTranslationTables(uri: vscode.Uri, entries: TableAt[]) {
    if (entries.length === 0) tables.delete(uri.toString());
    else tables.set(uri.toString(), entries);
}

/**
 * Shows the translation table of a LiquidJava error under its message in the editor hover, as a rendered table.
 * The message itself is shown by VS Code, as plain text, without the table (see the diagnostics middleware).
 */
export function registerHover(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerHoverProvider("java", {
            provideHover(document, position) {
                const entries = (tables.get(document.uri.toString()) ?? []).filter(entry => entry.range.contains(position));
                if (entries.length === 0) return null;
                return new vscode.Hover(entries.map(entry => {
                    const markdown = new vscode.MarkdownString(`**Instance translation table**\n\n${formatTableMarkdown(entry.table)}`);
                    markdown.supportHtml = false;
                    return markdown;
                }));
            },
        })
    );
}
