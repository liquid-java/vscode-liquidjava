import { LJDiagnostic, TranslationTable } from "../../types";

export const renderCustomSection = (title: string, body: string): string =>
    `<div class="section"><strong>${title}:</strong><div>${body}</div></div>`;

export const renderSection = (title: string, body: string): string =>
    renderCustomSection(title, `<pre>${body}</pre>`);

export const renderHeader = (diagnostic: LJDiagnostic): string => {
    return `<h3>${diagnostic.title}</h3><div class="diagnostic-header"><p>${diagnostic.message}</p></div>`;
};

export const renderLocation = (diagnostic: LJDiagnostic): string => {
    if (!diagnostic.position) return "";
    const line = diagnostic.position?.lineStart ?? 0;
    const column = diagnostic.position?.colStart ?? 0;
    const simpleFile = diagnostic.file.split('/').pop() || diagnostic.file;
    const link = `<a href="#" class="link location-link" data-file="${diagnostic.file}" data-line="${line}" data-column="${column}">${simpleFile}:${line}</a>`;
    return renderCustomSection("Location", `<pre>${link}</pre>`);
};

export function renderShowAllButton(showAll: boolean): string {
    return /*html*/`
        <button class="show-all-button" title="Toggle filter diagnostics by current file">
            ${showAll ? 'Show in File' : 'Show All'}
        </button>
    `;
}

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