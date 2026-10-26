import type { LJDiagnostic, LJHint, SourcePosition } from "../../types/diagnostics";
import { escapeHtml, getFileName, getSimpleName } from "../utils";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../highlighting";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "../diagnostic-reveal";
import { renderCodicon, renderCodiconButton } from "../icons";
import { LJVariable } from "../../types/context";

export const renderMainHeader = (title: string, selectedTab: NavTab, stateErrorCount = 0): string => /*html*/`
    <div class="header">
        ${renderNav(selectedTab, stateErrorCount)}
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
                        <ul>${options.map(hint => `<li>${renderHintMessage(hint)}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                ${notes.map(hint => `<div class="hint-note">${renderHintMessage(hint)}</div>`).join('')}
            </div>
        </details>
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

export function renderNav(selectedTab: NavTab, stateErrorCount = 0): string {
    const stateErrorBadge = stateErrorCount > 0
        ? ` <span class="nav-badge" title="${stateErrorCount} state error${stateErrorCount === 1 ? '' : 's'}">${stateErrorCount}</span>`
        : '';
    return /*html*/`
        <nav>
            <ul>
                <li><button class="nav-tab ${selectedTab === 'diagnostics' ? 'selected' : ''}" data-tab="diagnostics">Verification</button></li>
                <li><button class="nav-tab ${selectedTab === 'fsm' ? 'selected' : ''}" data-tab="fsm">State Machine${stateErrorBadge}</button></li>
                <li><button class="nav-tab ${selectedTab === 'context' ? 'selected' : ''}" data-tab="context">Context</button></li>
            </ul>
        </nav>
    `;
}
