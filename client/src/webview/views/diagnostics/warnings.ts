import type { CustomWarning, ExternalClassNotFoundWarning, ExternalMethodNotFoundWarning, LJWarning, UnsatisfiableRefinementWarning } from "../../../types/diagnostics";
import { renderDiagnosticDataAttributes, renderExpressionSection, renderDiagnosticHeader, renderLocation } from "../sections";
import { renderCopyDiagnosticButton } from "./diagnostics";

export function renderWarnings(warnings: LJWarning[]): string {
    return /*html*/`
        <ul>
                ${warnings.map((warning, index) => /*html*/`
                <li class="diagnostic-item warning-item" ${renderDiagnosticDataAttributes(warning)}>
                    <div class="diagnostic-actions">
                        ${renderCopyDiagnosticButton('warning', index)}
                    </div>
                    ${renderWarning(warning)}
                </li>
            `).join("")}
        </ul>    
    `;
}

type WarningContentRenderers = { [E in LJWarning as E['type']]: (warning: E) => string };

const warningContentRenderers: WarningContentRenderers = {
    'external-class-not-found-warning': (w: ExternalClassNotFoundWarning) => /*html*/ `
        ${renderExpressionSection('Class Name', w.className)}
    `,
    'external-method-not-found-warning': (w: ExternalMethodNotFoundWarning) => /*html*/ `
        ${renderExpressionSection('Method', w.signature)}
        ${w.overloads.length > 0 ? renderExpressionSection('Overloads', w.overloads.join('\n')) : ''}
    `,
    'unsatisfiable-refinement-warning': (w: UnsatisfiableRefinementWarning) => /*html*/ `
        ${renderExpressionSection('Refinement', w.refinement)}
    `,
    "custom-warning": (_: CustomWarning) => ""
}

export function renderWarning(warning: LJWarning): string {
    const header = renderDiagnosticHeader(warning.title, warning.message);
    const content = (warningContentRenderers[warning.type] as (warning: LJWarning) => string)?.(warning) || '';
    const location = renderLocation(warning);
    return /*html*/`${header}${content}${location}`;
}
