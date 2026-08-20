import type { LJDiagnostic, SourcePosition } from "../../types/diagnostics";
import { escapeHtml, getFileName, getSimpleName } from "../utils";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../highlighting";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "../diagnostic-reveal";
import { renderCodicon, renderCodiconButton } from "../icons";
import { LJVariable } from "../../types/context";

export const renderMainHeader = (title: string, selectedTab: NavTab): string => /*html*/`
    <div class="header">
        ${renderNav(selectedTab)}
        <h2>${title}</h2>
    </div>
`;

export const renderCustomSection = (title: string, body: string): string => /*html*/
    `<div class="section"><strong>${title}:</strong><div>${body}</div></div>`;

export const renderSection = (title: string, body: string): string => /*html*/
    renderCustomSection(title, `<pre>${body}</pre>`);

export const renderExpressionSection = (title: string, expression: string): string => /*html*/
    renderCustomSection(title, renderHighlightedExpression(expression));

export const renderToggleSection = (title: string, targetId: string, isExpanded: boolean = true): string => /*html*/`
    <button class="context-toggle-btn" data-context-toggle="${targetId}" aria-expanded="${isExpanded ? 'true' : 'false'}" type="button">
        ${renderCodicon(isExpanded ? "triangle-down" : "triangle-right", "context-toggle-icon")}
        <span>${title}</span>
    </button>
    `;

export const renderDiagnosticHeader = (title: string, message: string): string => /*html*/
    `<h3>${title}</h3><div class="diagnostic-header"><p>${message}</p></div>`;

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
        variable.type,
        position,
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
    const label = "View error on state machine";
    return /*html*/`
        <button class="icon-button diagnostic-state-machine-btn" title="${label}" aria-label="${label}"
            data-error-index="${errorIndex}" type="button">
            ${renderCodicon("type-hierarchy")}
            <span class="diagnostic-state-machine-badge" aria-hidden="true">!</span>
        </button>
    `;
}

export function renderDiagnosticRevealButton(position: SourcePosition, content: string): string {
    if (!position.file) return `<code>${content}</code>`
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

export function renderNav(selectedTab: NavTab): string {
    return /*html*/`
        <nav>
            <ul>
                <li><button class="nav-tab ${selectedTab === 'diagnostics' ? 'selected' : ''}" data-tab="diagnostics">Verification</button></li>
                <li><button class="nav-tab ${selectedTab === 'context' ? 'selected' : ''}" data-tab="context">Context</button></li>
                <li><button class="nav-tab ${selectedTab === 'fsm' ? 'selected' : ''}" data-tab="fsm">State Machine</button></li>
            </ul>
        </nav>
    `;
}
