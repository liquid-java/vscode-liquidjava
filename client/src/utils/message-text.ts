import type { LJHint, LJSourceReference } from "../types/diagnostics";

// a part of a line of a diagnostic: plain text, code the verifier marks with backticks, or a place in the source it names
export type MessageSegment =
    | { kind: "text"; text: string }
    | { kind: "code"; code: string }
    | { kind: "reference"; reference: LJSourceReference };

// a run of backticks, the code, and a run of the same length, as the verifier marks code in its messages
const CODE_SPAN = /(`+)([\s\S]+?)(?<!`)\1(?!`)/y;

/**
 * Splits a line of a diagnostic, such as a note or a hint, into its text, the code it marks with backticks,
 * without the backticks, and the places in the source it names
 * @param references the places the diagnostic names, of which only those of this line are used
 */
export function splitMessageText(message: string, references: LJSourceReference[] = []): MessageSegment[] {
    const links = references.filter(reference =>
        reference.message === message && message.startsWith(reference.text, reference.start));
    const segments: MessageSegment[] = [];
    let text = "";
    const flushText = () => {
        if (text) segments.push({ kind: "text", text });
        text = "";
    };
    let index = 0;
    while (index < message.length) {
        const link = links.find(reference => reference.start === index);
        if (link) {
            flushText();
            segments.push({ kind: "reference", reference: link });
            index += link.text.length;
            continue;
        }
        CODE_SPAN.lastIndex = index;
        const span = message[index] === "`" ? CODE_SPAN.exec(message) : null;
        if (span) {
            flushText();
            segments.push({ kind: "code", code: unpad(span[2]) });
            index += span[0].length;
            continue;
        }
        text += message[index];
        index++;
    }
    flushText();
    return segments;
}

// the code without the space on each side that the verifier adds to code that holds a backtick or a space at an end
function unpad(code: string): string {
    return code.length >= 2 && code.startsWith(" ") && code.endsWith(" ") ? code.slice(1, -1) : code;
}

/**
 * The hints of a diagnostic as they are shown: several call sequences are alternatives, so they are listed as options
 * apart from the hints that explain the error
 */
export function groupHints(hints: LJHint[] | undefined): { shown: LJHint[]; options: LJHint[]; notes: LJHint[] } {
    const shown = (hints ?? []).filter(hint => hint.message.trim());
    const sequences = shown.filter(hint => hint.kind === "call-sequence");
    const options = sequences.length > 1 ? sequences : [];
    const notes = options.length > 0 ? shown.filter(hint => hint.kind !== "call-sequence") : shown;
    return { shown, options, notes };
}
