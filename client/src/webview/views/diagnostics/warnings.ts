import type { ExternalClassNotFoundWarning, ExternalMethodNotFoundWarning, LJWarning } from "../../../types/diagnostics";
import { renderDiagnosticDataAttributes, renderExpressionSection, renderDiagnosticHeader, renderLocation } from "../sections";
import { renderCopyDiagnosticButton } from "./diagnostics";

export function renderWarnings(warnings: LJWarning[]): string {
    return /*html*/`
        <ul>
                ${warnings.map((warning, index) => /*html*/`
                <li class="diagnostic-item warning-item" ${renderDiagnosticDataAttributes(warning)}>
                    ${renderCopyDiagnosticButton('warning', index)}
                    ${renderWarning(warning)}
                </li>
            `).join("")}
        </ul>    
    `;
}

const warningContentRenderers: Partial<Record<LJWarning['type'], (warning: LJWarning) => string>> = {
    'external-class-not-found-warning': (w: ExternalClassNotFoundWarning) => /*html*/`
        ${renderExpressionSection('Class Name', w.className)}
    `,
    'external-method-not-found-warning': (w: ExternalMethodNotFoundWarning) => /*html*/`
        ${renderExpressionSection('Method', w.signature)}
        ${w.overloads.length > 0 ? renderExpressionSection('Overloads', w.overloads.join('\n')) : ''}
    `
};

export function renderWarning(warning: LJWarning): string {
    const header = renderDiagnosticHeader(warning.title, warning.message);
    const content = warningContentRenderers[warning.type]?.(warning) ?? '';
    const location = renderLocation(warning);
    return /*html*/`${header}${content}${location}`;
}
