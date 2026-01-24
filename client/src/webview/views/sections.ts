import type { LJDiagnostic, TranslationTable } from "../../types/diagnostics";

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

export const renderHeader = (diagnostic: LJDiagnostic): string => /*html*/
    `<h3>${diagnostic.title}</h3><div class="diagnostic-header"><p>${diagnostic.message}</p></div>`;

export const renderLocation = (diagnostic: LJDiagnostic): string => {
    if (!diagnostic.position) return "";
    const line = diagnostic.position?.lineStart ?? 0;
    const column = diagnostic.position?.colStart ?? 0;
    const simpleFile = diagnostic.file.split('/').pop() || diagnostic.file;
    const link = /*html*/`<a href="#" class="link location-link" data-file="${diagnostic.file}" data-line="${line}" data-column="${column}">${simpleFile}:${line}</a>`;
    return renderCustomSection("Location", /*html*/`<pre>${link}</pre>`);
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
                        const simpleFile = placement.position.file.split('/').pop() || placement.position.file;
                        const link = 
                            /*html*/`<a
                                href="#"
                                class="link location-link"
                                data-file="${placement.position.file}"
                                data-line="${placement.position.line}"
                                data-column="${placement.position.column}"
                            >
                                ${simpleFile}:${placement.position.line}
                            </a>`;
                        return /*html*/`
                            <tr>
                                <td><code>${variable}</code></td>
                                <td><code>${placement.text}</code></td>
                                <td>${link}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export type NavTab = 'verification' | 'state-machine';

export function renderNav(selectedTab: NavTab): string {
    return /*html*/`
        <nav>
            <ul>
                <li><button class="nav-tab ${selectedTab === 'verification' ? 'selected' : ''}" data-tab="verification">Verification</button></li>
                <li><button class="nav-tab ${selectedTab === 'state-machine' ? 'selected' : ''}" data-tab="state-machine">State Machine</button></li>
            </ul>
        </nav>
    `;
}