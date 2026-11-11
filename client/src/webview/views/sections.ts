import type { LJDiagnostic, LJHint, LJSourceReference, SourcePosition } from "../../types/diagnostics";
import { escapeHtml, getFileName } from "../utils";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../highlighting";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "../diagnostic-reveal";
import { renderCodicon, renderCodiconButton } from "../icons";
import { renderMessageText } from "../message-text";
import { LJVariable } from "../../types/context";

export const renderMainHeader = (title: string, selectedTab: NavTab, badges = NO_NAV_BADGES): string => /*html*/`
    <div class="header">
        ${renderNav(selectedTab, badges)}
        <h2>${title}</h2>
    </div>
`;

export const renderCustomSection = (title: string, body: string): string => /*html*/
    `<div class="section"><strong>${title}:</strong><div>${body}</div></div>`;

export const renderSection = (title: string, body: string): string => /*html*/
    renderCustomSection(title, `<pre>${body}</pre>`);

export const renderExpressionSection = (title: string, expression: string): string => /*html*/
    renderCustomSection(title, renderHighlightedExpression(expression));

// hints the user opened, kept open when the diagnostics are rendered again
const openHints = new Set<string>();

export function setHintOpen(key: string, open: boolean) {
    if (open) openHints.add(key);
    else openHints.delete(key);
}

/**
 * Renders the hints of a diagnostic, closed until the user opens them
 * Several call sequences are alternatives, so they are listed as options apart from the hints that explain the error
 * @param hints The hints of the diagnostic
 * @param key Identifies the diagnostic, so opened hints stay open after a new verification
 * @param references The places in the source the hints name
 */
export function renderHints(hints: LJHint[] | undefined, key?: string, references: LJSourceReference[] = []): string {
    const shown = (hints ?? []).filter(hint => hint.message.trim());
    if (shown.length === 0) return '';
    const options = shown.filter(hint => hint.kind === 'call-sequence');
    const listsOptions = options.length > 1;
    const notes = listsOptions ? shown.filter(hint => hint.kind !== 'call-sequence') : shown;
    const open = key !== undefined && openHints.has(key);
    return /*html*/`
        <details class="section hint-section"${key !== undefined ? ` data-hint-key="${escapeHtml(key)}"` : ''}${open ? ' open' : ''}>
            <summary class="hint-summary">${shown.length === 1 ? 'Hint' : 'Hints'}</summary>
            <div class="hint-body">
                ${listsOptions ? /*html*/`
                    <div class="hint-options">
                        <p class="hint-options-title">Any one of these:</p>
                        <ul>${options.map(hint => `<li>${renderHintMessage(hint, references)}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                ${notes.map(hint => `<div class="hint-note">${renderHintMessage(hint, references)}</div>`).join('')}
            </div>
        </details>
    `;
}

function renderHintMessage(hint: LJHint, references: LJSourceReference[]): string {
    return `<span class="hint-message">${renderMessageText(hint.message, references)}</span>`;
}

/**
 * Renders the notes under the message of a diagnostic, such as where a value comes from, with their links
 */
export function renderMessageNotes(diagnostic: LJDiagnostic): string {
    if (diagnostic.messageNotes.length === 0) return '';
    return /*html*/`<div class="section message-notes">${diagnostic.messageNotes
        .map(note => `<p class="message-note">${renderMessageText(note, diagnostic.references)}</p>`).join('')}</div>`;
}

export const renderToggleSection = (title: string, targetId: string, isExpanded: boolean = true): string => /*html*/`
    <button class="context-toggle-btn" data-context-toggle="${targetId}" aria-expanded="${isExpanded ? 'true' : 'false'}" type="button">
        ${renderCodicon(isExpanded ? "triangle-down" : "triangle-right", "context-toggle-icon")}
        <span>${title}</span>
    </button>
    `;

export const renderDiagnosticHeader = (title: string, message: string, actions = ''): string => /*html*/`
    <div class="diagnostic-title-row">
        <h3>${title}</h3>
        ${actions.trim() ? `<div class="diagnostic-actions">${actions}</div>` : ''}
    </div>
    <div class="diagnostic-header"><p>${renderMessageText(message)}</p></div>
`;

export function renderDiagnosticDataAttributes(diagnostic: LJDiagnostic): string {
    const target = getDiagnosticRevealTarget(diagnostic);
    return target ? `data-diagnostic-target="${getDiagnosticRevealTargetKey(target)}"` : "";
}

export const renderLocation = (diagnostic: LJDiagnostic): string => {
    const positions: SourcePosition[] = [];
    if (diagnostic.position && diagnostic.file) positions.push(diagnostic.position);

    const declaration = diagnostic.type === 'refinement-error' || diagnostic.type === 'state-refinement-error'
        ? diagnostic
        : null;
    const declarationPositions = declaration?.declarationPositions.filter(position => position.file) ?? [];
    positions.push(...declarationPositions);

    if (positions.length === 0) return "";
    const title = positions.length === 1 ? "Location" : "Locations";
    const links = positions.map(renderLocationLink).join("\n");
    // the notes explain the declarations, so they are shown only under their links
    const notes = declarationPositions.length > 0 ? declaration?.declarationNotes ?? [] : [];
    const noteLines = notes.map(note => `<span class="location-note">${renderMessageText(note)}</span>`).join("");
    return renderCustomSection(title, /*html*/`<pre>${links}${noteLines}</pre>`);
};

export function renderVariableHighlightButton(variable: LJVariable): string {
    const name = `<code>${renderHighlightedInlineExpression(variable.displayName)}</code>`;
    const position = variable.position;
    if (!position || !position.file) return name;
    return renderSourceHighlightButton(
        name,
        variable.type ? `Go to source (${variable.type})` : "Go to source",
        position,
        "clickable",
    );
}

export function renderSourceHighlightButton(
    content: string,
    title: string,
    position: SourcePosition & { file: string },
    className = "",
): string {
    return /*html*/`
        <button
            class="highlight-var-btn${className ? ` ${className}` : ""}"
            title="${escapeHtml(title)}"
            data-start-line="${position.lineStart}"
            data-start-column="${position.colStart}"
            data-end-line="${position.lineEnd}"
            data-end-column="${position.colEnd}"
            data-file="${escapeHtml(position.file)}"
        >
            ${content}
        </button>
    `;
}

export function renderDiagnosticContextButton(position?: SourcePosition | null): string {
    if (!position?.file) return "";
    return renderCodiconButton("symbol-variable", {
        className: "diagnostic-context-btn",
        title: "View related context",
        attributes: `data-diagnostic-target="${getDiagnosticRevealTargetKey({ file: position.file, position })}"`,
    });
}

export function renderDiagnosticStateMachineButton(errorIndex: number): string {
    return /*html*/`
        <button class="diagnostic-state-machine-btn" data-error-index="${errorIndex}" type="button">
            ${renderCodicon("type-hierarchy")}<span>Show in state machine</span>
        </button>
    `;
}

export function renderDiagnosticRevealButton(position: SourcePosition, content: string): string {
    if (!position.file) return `<code>${content}</code>`;
    return /*html*/`
        <button
            class="diagnostic-reveal-btn error"
            data-diagnostic-target="${getDiagnosticRevealTargetKey({ file: position.file, position })}"
        >
            <code>${content}</code>
        </button>
    `;
}

export function renderLocationLink(position?: SourcePosition): string {
    if (!position) return 'No location';
    return /*html*/`<a
        href="#"
        class="link location-link"
        data-file="${position.file}"
        data-line="${position.lineStart}"
        data-column="${position.colStart}"
    >${escapeHtml(getFile(position))}</a>`;
}

function getFile(position: SourcePosition): string {
    return `${position.file ? getFileName(position.file) : position.file}:${position.lineStart + 1}`;
}

export type NavTab = 'diagnostics' | 'fsm' | 'context';

function renderNavBadge(count: number, noun: string, className: string): string {
    if (count <= 0) return '';
    return ` <span class="nav-badge ${className}" title="${count} ${noun}${count === 1 ? '' : 's'}">${count}</span>`;
}

/**
 * The counts shown on the tabs: the errors of the current file on Verification, and those of them that are state
 * errors on State Machine, in a quieter colour since Verification already counts them
 */
export type NavBadges = {
    errors: number;
    stateErrors: number;
};

export const NO_NAV_BADGES: NavBadges = { errors: 0, stateErrors: 0 };

export function renderNav(selectedTab: NavTab, badges = NO_NAV_BADGES): string {
    const errorBadge = renderNavBadge(badges.errors, 'error', 'nav-badge-error');
    const stateErrorBadge = renderNavBadge(badges.stateErrors, 'state error', 'nav-badge-state-error');
    return /*html*/`
        <nav>
            <ul>
                <li><button class="nav-tab ${selectedTab === 'diagnostics' ? 'selected' : ''}" data-tab="diagnostics">Verification${errorBadge}</button></li>
                <li><button class="nav-tab ${selectedTab === 'fsm' ? 'selected' : ''}" data-tab="fsm">State Machine${stateErrorBadge}</button></li>
                <li><button class="nav-tab ${selectedTab === 'context' ? 'selected' : ''}" data-tab="context">Context</button></li>
            </ul>
        </nav>
    `;
}
