import type { LJDiagnostic, LJHint, LJSourceReference, SourcePosition } from "../types/diagnostics";
import { groupHints, splitMessageText } from "./message-text";

// the link that opens a place in the source, or null if it has no file
export type LinkTarget = (position: SourcePosition) => string | null;

/**
 * Formats the details the editor hover shows under a diagnostic's message, in markdown: the notes that explain it
 * (such as where a value comes from), the counterexample and the hints, with their code as inline code and the places
 * they name as links. The message itself is not repeated: VS Code's own part of the hover shows it, as plain text,
 * from the Problems entry
 * @param linkTo the link that opens a place
 * @returns the markdown, or null if the diagnostic has no details
 */
export function formatDiagnosticMarkdown(diagnostic: LJDiagnostic, linkTo: LinkTarget): string | null {
    const parts = [
        ...diagnostic.messageNotes.map(note => formatMessageMarkdown(note, diagnostic.references, linkTo)),
        formatCounterexampleMarkdown(diagnostic),
        formatHintsMarkdown(diagnostic.hints, diagnostic.references, linkTo),
    ].filter((part): part is string => part !== null && part.length > 0);
    return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * Formats the hints of a diagnostic in markdown, as the panel shows them: their code as inline code and the places
 * they name as links, with everything else escaped, since hints hold expressions with `*`, `_`, `<` or `|`
 * @param references the places the hints name
 * @param linkTo the link that opens a place
 * @returns the markdown, or null if there are no hints
 */
export function formatHintsMarkdown(hints: LJHint[] | undefined, references: LJSourceReference[], linkTo: LinkTarget): string | null {
    const { shown, options, notes } = groupHints(hints);
    if (shown.length === 0) return null;
    const format = (hint: LJHint) => formatMessageMarkdown(hint.message, references, linkTo);
    return [
        shown.length === 1 ? "**Hint**" : "**Hints**",
        ...options.length > 0 ? ["Any one of these:", options.map(hint => `- ${format(hint)}`).join("\n")] : [],
        ...notes.map(format),
    ].join("\n\n");
}

// Counterexample: `x == 1 && y == 0`, as the verifier prints it, or null if the diagnostic has none
function formatCounterexampleMarkdown(diagnostic: LJDiagnostic): string | null {
    if (diagnostic.type !== "refinement-error" || diagnostic.counterexample.assignments.length === 0) return null;
    const assignments = diagnostic.counterexample.assignments.map(a => `${a.variable} == ${a.value}`).join(" && ");
    return `Counterexample: ${formatInlineCode(assignments)}`;
}

function formatMessageMarkdown(message: string, references: LJSourceReference[], linkTo: LinkTarget): string {
    return splitMessageText(message, references).map(segment => {
        switch (segment.kind) {
            case "reference": {
                const target = linkTo(segment.reference.position);
                const text = escapeMarkdown(segment.reference.text);
                return target ? `[${text}](${target})` : text;
            }
            case "code": return formatInlineCode(segment.code);
            case "text": return escapeMarkdown(segment.text);
        }
    }).join("");
}

// a fence longer than any run of backticks in the code, and a space on each side, which markdown strips, if the code
// starts or ends with a backtick or a space
function formatInlineCode(code: string): string {
    const fence = "`".repeat(Math.max(0, ...(code.match(/`+/g) ?? []).map(run => run.length)) + 1);
    const pad = /^[`\s]|[`\s]$/.test(code) ? " " : "";
    return `${fence}${pad}${code}${pad}${fence}`;
}

// every ASCII punctuation character can be escaped in markdown, so all are, rather than those that start a construct
function escapeMarkdown(text: string): string {
    return text.replace(/[!-/:-@[-`{-~]/g, "\\$&");
}
