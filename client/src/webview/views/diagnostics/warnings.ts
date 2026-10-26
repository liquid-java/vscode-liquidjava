import type { CustomWarning, ExternalClassNotFoundWarning, ExternalMethodNotFoundWarning, LJWarning, UnsatisfiableRefinementWarning } from "../../../types/diagnostics";
import { renderDiagnosticDataAttributes, renderExpressionSection, renderDiagnosticHeader, renderHint, renderLocation } from "../sections";
import { renderCopyDiagnosticButton } from "./diagnostics";
import { getDiagnosticKey } from "../../diagnostic-reveal";

export function renderWarnings(warnings: LJWarning[]): string {
    return /*html*/`
        <ul>
                ${warnings.map((warning, index) => /*html*/`
                <li class="diagnostic-item warning-item" ${renderDiagnosticDataAttributes(warning)}>
                    ${renderWarning(warning, renderCopyDiagnosticButton('warning', index))}
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
};

export function renderWarning(warning: LJWarning, actions = ''): string {
    const header = renderDiagnosticHeader(warning.title, warning.message, actions);
    const content = (warningContentRenderers[warning.type] as (warning: LJWarning) => string)?.(warning) || '';
    const hint = renderHint(warning.hint, getDiagnosticKey(warning));
    const location = renderLocation(warning);
    return /*html*/`${header}${content}${hint}${location}`;
}
