import type { LJDiagnostic, PlacementInCode, SourcePosition, TranslationTable } from "../../types/diagnostics";
import { escapeHtml } from "../utils";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../highlighting";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "../diagnostic-reveal";

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
        <span class="context-toggle-icon">${isExpanded ? '▾' : '▸'}</span>
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
    if (!diagnostic.position || !diagnostic.file) return "";
    return renderCustomSection("Location", /*html*/`<pre>${renderLocationLink(diagnostic.position)}</pre>`);
};

export function renderTranslationTable(translationTable: TranslationTable): string {  
    const entries = Object.entries(translationTable).sort((a, b) => a[0].localeCompare(b[0])); // sort by variable name
    if (entries.length === 0) return '';
    
    return /*html*/`
        <div class="translation-table">
            <h3>Context Variables</h3>
            <table>
                <thead>
                    <tr>
                        <th>Variable</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(([variable, placement]: [string, PlacementInCode]) => {
                        return /*html*/`
                            <tr>
                                <td><code>${renderHighlightedInlineExpression(variable)}</code></td>
                                <td>${renderHighlightButton(placement.position!, placement.text)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function renderHighlightButton(position: SourcePosition, content: string, error: boolean = false): string {
    return /*html*/`
        <button
            class="highlight-var-btn ${error ? 'error' : ''}"
            data-start-line="${position.lineStart}"
            data-start-column="${position.colStart}"
            data-end-line="${position.lineEnd}"
            data-end-column="${position.colEnd}"
            data-file="${position.file}"
        >
            <code>${renderHighlightedInlineExpression(content)}</code>
        </button>
    `;
}

export function renderDiagnosticRevealButton(position: SourcePosition, content: string): string {
    return /*html*/`
        <button
            class="diagnostic-reveal-btn error"
            data-diagnostic-target="${getDiagnosticRevealTargetKey({ file: position.file!, position })}"
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
    return `${position.file.split('/').pop().trim() || position.file}:${position.lineStart + 1}`;
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
