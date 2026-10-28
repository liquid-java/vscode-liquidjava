import type { LJDiagnostic, LJHint, SourcePosition } from "../../types/diagnostics";
import { escapeHtml, getFileName, getSimpleName } from "../utils";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../highlighting";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "../diagnostic-reveal";
import { renderCodicon, renderCodiconButton } from "../icons";
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
 */
export function renderHints(hints: LJHint[] | undefined, key?: string): string {
    const shown = getShownHints(hints);
    if (shown.length === 0) return '';
    return /*html*/`
        <details class="section hint-section"${renderHintKey(key)}>
            <summary class="hint-summary">${shown.length === 1 ? 'Hint' : 'Hints'}</summary>
            <div class="hint-body">${renderHintList(shown)}</div>
        </details>
    `;
}

export function getShownHints(hints: LJHint[] | undefined): LJHint[] {
    return (hints ?? []).filter(hint => hint.message.trim());
}

// the attributes that keep a hint section open across renders
export function renderHintKey(key: string | undefined): string {
    if (key === undefined) return '';
    return ` data-hint-key="${escapeHtml(key)}"${openHints.has(key) ? ' open' : ''}`;
}

/**
 * Renders hints with the calls to add as options, when there are several, followed by the other hints
 * @param hints the hints with a message
 */
export function renderHintList(hints: LJHint[]): string {
    const options = hints.filter(hint => hint.kind === 'call-sequence');
    const listsOptions = options.length > 1;
    const notes = listsOptions ? hints.filter(hint => hint.kind !== 'call-sequence') : hints;
    return /*html*/`
        ${listsOptions ? /*html*/`
            <div class="hint-options">
                <p class="hint-options-title">Any one of these:</p>
                <ul>${options.map(hint => `<li>${renderHintMessage(hint)}</li>`).join('')}</ul>
            </div>
        ` : ''}
        ${notes.map(hint => `<div class="hint-note">${renderHintMessage(hint)}</div>`).join('')}
    `;
}

function renderHintMessage(hint: LJHint): string {
    return `<span class="hint-message">${escapeHtml(hint.message.trim())}</span>`;
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
    <div class="diagnostic-header"><p>${message}</p></div>
`;

export function renderDiagnosticDataAttributes(diagnostic: LJDiagnostic): string {
    const target = getDiagnosticRevealTarget(diagnostic);
    return target ? `data-diagnostic-target="${getDiagnosticRevealTargetKey(target)}"` : "";
}

export const renderLocation = (diagnostic: LJDiagnostic): string => {
    const positions: SourcePosition[] = [];
    if (diagnostic.position && diagnostic.file) positions.push(diagnostic.position);

    const declarationPosition = diagnostic.type === 'refinement-error' || diagnostic.type === 'state-refinement-error'
        ? diagnostic.declarationPosition
        : null;
    if (declarationPosition?.file) positions.push(declarationPosition);

    if (positions.length === 0) return "";
    const title = positions.length === 1 ? "Location" : "Locations";
    const links = positions.map(renderLocationLink).join("\n");
    return renderCustomSection(title, /*html*/`<pre>${links}</pre>`);
};

export function renderVariableHighlightButton(variable: LJVariable): string {
    const displayName = getSimpleName(variable.name);
    const position = variable.position;
    if (!position || !position.file) return `<code>${displayName}</code>`;
    return renderSourceHighlightButton(
        `<code>${renderHighlightedInlineExpression(displayName)}</code>`,
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
