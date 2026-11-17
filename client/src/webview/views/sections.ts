import type { LJDiagnostic, LJHint, LJSourceReference, SourcePosition } from "../../types/diagnostics";
import { escapeHtml, getFileName } from "../utils";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../highlighting";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "../diagnostic-reveal";
import { renderCodicon, renderCodiconButton } from "../icons";
import { renderMessageText } from "../message-text";
import { groupHints } from "../../utils/message-text";
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

// the folds the user opened (hints, origin, locations), kept open when the diagnostics are rendered again
export type FoldKind = 'hints' | 'origin' | 'locations';
const openFolds = new Set<string>();

export function setFoldOpen(kind: FoldKind, key: string, open: boolean) {
    if (open) openFolds.add(`${kind}:${key}`);
    else openFolds.delete(`${kind}:${key}`);
}

export function isFoldOpen(kind: FoldKind, key: string | undefined): boolean {
    return key !== undefined && openFolds.has(`${kind}:${key}`);
}

export function setHintOpen(key: string, open: boolean) {
    setFoldOpen('hints', key, open);
}

/**
 * Renders a section closed until the user opens it, like the hints: the origin notes and the locations of an error
 * @param kind names the fold in the usage log
 * @param title the summary line
 * @param body the content
 * @param key identifies the diagnostic, so an opened fold stays open after a new verification
 */
export function renderFold(kind: FoldKind, title: string, body: string, key?: string): string {
    const open = isFoldOpen(kind, key);
    return /*html*/`
        <details class="section fold-section fold-${kind}" data-fold-kind="${kind}"${key !== undefined ? ` data-fold-key="${escapeHtml(key)}"` : ''}${open ? ' open' : ''}>
            <summary class="fold-summary">${title}</summary>
            <div class="fold-body">${body}</div>
        </details>
    `;
}

/**
 * Renders the hints of a diagnostic, closed until the user opens them
 * @param hints The hints of the diagnostic
 * @param key Identifies the diagnostic, so opened hints stay open after a new verification
 * @param references The places in the source the hints name
 */
export function renderHints(hints: LJHint[] | undefined, key?: string, references: LJSourceReference[] = []): string {
    const { shown, options, notes } = groupHints(hints);
    if (shown.length === 0) return '';
    const open = isFoldOpen('hints', key);
    return /*html*/`
        <details class="section hint-section" data-fold-kind="hints"${key !== undefined ? ` data-hint-key="${escapeHtml(key)}" data-fold-key="${escapeHtml(key)}"` : ''}${open ? ' open' : ''}>
            <summary class="hint-summary">${shown.length === 1 ? 'Hint' : 'Hints'}</summary>
            <div class="hint-body">
                ${options.length > 0 ? /*html*/`
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
 * Renders the notes under the message of a diagnostic, such as where a value comes from, with their links, in a fold
 * titled Origin that is closed until opened (the view shows Expected and Found first)
 * @param key identifies the diagnostic, so an opened fold stays open after a new verification
 */
export function renderMessageNotes(diagnostic: LJDiagnostic, key?: string): string {
    if (diagnostic.messageNotes.length === 0) return '';
    const notes = diagnostic.messageNotes
        // the fold's title says Origin, so the note's own prefix goes; after rendering, since the references' offsets count from the full text
        .map(note => `<p class="message-note">${renderMessageText(note, diagnostic.references).replace(/^Origin:\s*/, '')}</p>`).join('');
    return renderFold('origin', 'Origin', `<div class="message-notes">${notes}</div>`, key);
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

export const renderLocation = (diagnostic: LJDiagnostic, key?: string): string => {
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
    return renderFold('locations', title, /*html*/`<pre>${links}${noteLines}</pre>`, key);
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
