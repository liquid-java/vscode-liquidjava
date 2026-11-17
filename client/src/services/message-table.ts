/**
 * The "Instance translation table" at the end of a LiquidJava message, taken out of the plain text and rendered as a
 * markdown table for the editor hover. The text itself is not changed otherwise: VS Code shows a diagnostic's message
 * as plain text, so the table is readable only once rendered.
 */

export type TranslationTable = { header: string[]; rows: string[][] };

const TABLE_TITLE = "Instance translation table:";

/** Splits the table out of a message; text is the message without the table section, table is null if it has none */
export function splitTranslationTable(message: string): { text: string; table: TranslationTable | null } {
    const lines = message.split("\n");
    const start = lines.findIndex(line => line.trim() === TABLE_TITLE);
    if (start < 0) return { text: message, table: null };
    const cells: string[][] = [];
    let end = start + 1;
    for (; end < lines.length; end++) {
        const line = lines[end];
        if (/^-{5,}\s*$/.test(line)) continue;          // a rule between the rows
        if (line.trimStart().startsWith("|")) { cells.push(splitRow(line)); continue; }
        break;                                           // the blank line, or the Location, after the table
    }
    if (cells.length < 2) return { text: message, table: null };
    const [header, ...rows] = cells;
    // the section goes, with one of the blank lines around it, so the text does not keep a double gap
    const before = lines.slice(0, start);
    const after = lines.slice(end);
    if (before.length > 0 && before[before.length - 1].trim() === "" && after.length > 0 && after[0].trim() === "") after.shift();
    return { text: [...before, ...after].join("\n"), table: { header, rows } };
}

// "| #kettle_19   | new Kettle()   | Practice2.java:13, 16 " -> three trimmed cells; Java's || never has a space on both sides
function splitRow(line: string): string[] {
    return line.trim().replace(/^\|\s?/, "").split(/ \| /).map(cell => cell.trim());
}

/** The table in markdown, names and code as inline code so that # and _ are not read as markdown */
export function formatTableMarkdown(table: TranslationTable): string {
    const width = table.header.length;
    const row = (cells: string[], code: boolean) =>
        `| ${Array.from({ length: width }, (_, i) => (code ? inlineCode(cells[i] ?? "") : escape(cells[i] ?? ""))).join(" | ")} |`;
    return [
        row(table.header, false),
        `|${" --- |".repeat(width)}`,
        ...table.rows.map(cells => row(cells.map((cell, i) => (i === width - 1 ? cell : cell)), true)),
    ].join("\n");
}

function inlineCode(text: string): string {
    if (text.length === 0) return "";
    const fence = "`".repeat(Math.max(0, ...(text.match(/`+/g) ?? []).map(run => run.length)) + 1);
    return `${fence}${text.replace(/\|/g, "\\|")}${fence}`;
}

function escape(text: string): string {
    return text.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, "\\$&");
}
