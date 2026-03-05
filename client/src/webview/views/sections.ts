import type { LJDiagnostic, SourcePosition, TranslationTable } from "../../types/diagnostics";

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

export const renderToggleSection = (title: string, targetId: string, isExpanded: boolean = true): string => /*html*/`
    <button class="context-toggle-btn" data-context-toggle="${targetId}" aria-expanded="${isExpanded ? 'true' : 'false'}" type="button">
        <span class="context-toggle-icon">${isExpanded ? '▾' : '▸'}</span>
        <span>${title}</span>
    </button>
    `;

export const renderDiagnosticHeader = (diagnostic: LJDiagnostic): string => /*html*/
    `<h3>${diagnostic.title}</h3><div class="diagnostic-header"><p>${diagnostic.message}</p></div>`;

export const renderLocation = (diagnostic: LJDiagnostic): string => {
    if (!diagnostic.position || !diagnostic.file) return "";
    const position: SourcePosition = {
        file: diagnostic.file,
        line: diagnostic.position.lineStart,
        column: diagnostic.position.colStart
    }
    return renderCustomSection("Location", /*html*/`<pre>${renderLocationLink(position)}</pre>`);
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
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(([variable, placement]: [string, any]) => {
                        return /*html*/`
                            <tr>
                                <td><code>${variable}</code></td>
                                <td><code>${placement.text}</code></td>
                                <td>${renderLocationLink(placement.position)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function renderLocationLink(position?: SourcePosition): string {
    if (!position) return 'No location';
    const file = `${position.file.split('/').pop().trim() || position.file}:${position.line + 1}`;
    return /*html*/`<a
        href="#"
        class="link location-link"
        data-file="${position.file}"
        data-line="${position.line}"
        data-column="${position.column}"
    >${file}</a>`;
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
