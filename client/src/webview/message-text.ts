import type { LJSourceReference } from "../types/diagnostics";
import { renderLineTags } from "./highlighting";
import { escapeHtml } from "./utils";

// a run of backticks, the code, and a run of the same length, as the verifier marks code in its messages
const CODE_SPAN = /(`+)([\s\S]+?)(?<!`)\1(?!`)/y;

/**
 * Renders a line of a diagnostic, such as a note or a hint: the code it marks with backticks in the editor font,
 * without the backticks, and each place in the source it names as a link that opens that place
 * @param references the places the diagnostic names, of which only those of this line are used
 */
export function renderMessageText(message: string, references: LJSourceReference[] = []): string {
    const links = references.filter(reference =>
        reference.message === message && message.startsWith(reference.text, reference.start));
    let html = "";
    let index = 0;
    while (index < message.length) {
        const link = links.find(reference => reference.start === index);
        if (link) {
            html += renderReferenceLink(link);
            index += link.text.length;
            continue;
        }
        CODE_SPAN.lastIndex = index;
        const span = message[index] === "`" ? CODE_SPAN.exec(message) : null;
        if (span) {
            html += `<code class="lj-code">${renderLineTags(unpad(span[2]))}</code>`;
            index += span[0].length;
            continue;
        }
        html += escapeHtml(message[index]);
        index++;
    }
    return html;
}

// the code without the space on each side that the verifier adds to code that holds a backtick or a space at an end
function unpad(code: string): string {
    return code.length >= 2 && code.startsWith(" ") && code.endsWith(" ") ? code.slice(1, -1) : code;
}

function renderReferenceLink(reference: LJSourceReference): string {
    const { position } = reference;
    return /*html*/`<a href="#" class="link location-link message-reference" data-file="${escapeHtml(position.file ?? "")}" data-line="${position.lineStart}" data-column="${position.colStart}">${escapeHtml(reference.text)}</a>`;
}
