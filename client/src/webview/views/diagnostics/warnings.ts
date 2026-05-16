import type { ExternalClassNotFoundWarning, ExternalMethodNotFoundWarning, LJWarning } from "../../../types/diagnostics";
import { renderDiagnosticDataAttributes, renderDiagnosticHeader, renderLocation, renderSection } from "../sections";

export function renderWarnings(warnings: LJWarning[]): string {
    return /*html*/`
        <ul>
            ${warnings.map(warning => /*html*/`
                <li class="diagnostic-item warning-item" ${renderDiagnosticDataAttributes(warning)}>
                    ${renderWarning(warning)}
                </li>
            `).join("")}
        </ul>    
    `;
}

const warningContentRenderers: Partial<Record<LJWarning['type'], (warning: LJWarning) => string>> = {
    'external-class-not-found-warning': (w: ExternalClassNotFoundWarning) => /*html*/`
        ${renderSection('Class Name', w.className)}
    `,
    'external-method-not-found-warning': (w: ExternalMethodNotFoundWarning) => /*html*/`
        ${renderSection('Method', w.methodName)}
        ${w.overloads.length > 0 ? renderSection('Overloads', w.overloads.join('\n')) : ''}
    `
};

export function renderWarning(warning: LJWarning): string {
    const header = renderDiagnosticHeader(warning);
    const content = warningContentRenderers[warning.type]?.(warning) ?? '';
    const location = renderLocation(warning);
    return /*html*/`${header}${content}${location}`;
}
