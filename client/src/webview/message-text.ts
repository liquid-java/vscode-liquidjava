import type { LJSourceReference } from "../types/diagnostics";
import { splitMessageText } from "../utils/message-text";
import { renderLineTags } from "./highlighting";
import { escapeHtml } from "./utils";

/**
 * Renders a line of a diagnostic, such as a note or a hint: the code it marks with backticks in the editor font,
 * without the backticks, and each place in the source it names as a link that opens that place
 * @param references the places the diagnostic names, of which only those of this line are used
 */
export function renderMessageText(message: string, references: LJSourceReference[] = []): string {
    return splitMessageText(message, references).map(segment => {
        switch (segment.kind) {
            case "reference": return renderReferenceLink(segment.reference);
            case "code": return `<code class="lj-code">${renderLineTags(segment.code)}</code>`;
            case "text": return escapeHtml(segment.text);
        }
    }).join("");
}

function renderReferenceLink(reference: LJSourceReference): string {
    const { position } = reference;
    return /*html*/`<a href="#" class="link location-link message-reference" data-file="${escapeHtml(position.file ?? "")}" data-line="${position.lineStart}" data-column="${position.colStart}">${escapeHtml(reference.text)}</a>`;
}
