import { renderHeader, renderLocation, renderSection, renderCustomSection } from "./utils";
import {
    ArgumentMismatchError,
    InvalidRefinementError,
    LJError,
    NotFoundError,
    RefinementError,
    StateConflictError,
    StateRefinementError,
    SyntaxError,

} from "../../../types";
import { renderDerivationNode } from "./derivation-nodes";
import { renderShowAllButton } from "./show-all-button";

export function getErrorsView(errors: LJError[], showAll: boolean, currentFile: string | undefined): string {
    const displayDiagnostics = showAll ? errors : errors.filter(error => error.file && error.file?.toLowerCase() === currentFile?.toLowerCase());
    const hiddenCount = errors.length - displayDiagnostics.length;
    return /*html*/`
        <div>
            <div class="header">
                <h2>Failed Verification</h2>
                ${renderShowAllButton(showAll)}
            </div>
            <p class="info">${`${errors.length} error${errors.length !== 1 ? 's were' : ' was'} found by the LiquidJava verifier.`}</p>
            <div class="content">
                <ul>
                    ${displayDiagnostics.map((error) => /*html*/`
                        <li class="diagnostic-item error-item">
                            ${renderError(error)}
                        </li>
                    `).join("")}
                </ul>
                ${hiddenCount > 0 ? `<p class="more-indicator">(+${hiddenCount} error${hiddenCount !== 1 ? 's' : ''})</p>` : ''}
            </div>
        </div>
    `;
}

const errorContentRenderers: Partial<Record<LJError['type'], (error: LJError) => string>> = {
    'refinement-error': (e: RefinementError) => /*html*/`
        ${renderSection('Expected', e.expected.value)}
        ${renderCustomSection('Found', renderDerivationNode(e, e.found))}
    `,
    'state-refinement-error': (e: StateRefinementError) => /*html*/`
        ${renderSection('Expected', e.expected)}
        ${renderSection('Found', e.found)}
    `,
    'invalid-refinement-error': (e: InvalidRefinementError) => /*html*/`
        ${renderSection('Refinement', e.refinement)}
    `,
    'not-found-error': (e: NotFoundError) => /*html*/`
        ${renderSection(e.kind, e.name)}
    `,
    'state-conflict-error': (e: StateConflictError) => /*html*/`
        ${renderSection('State', e.state)}
    `,
    'syntax-error': (e: SyntaxError) => /*html*/`
        ${renderSection('Refinement', e.refinement)}
    `,
    'argument-mismatch-error': (e: ArgumentMismatchError) => /*html*/`
        ${renderSection('Refinement', e.refinement)}
    `
};

export function renderError(error: LJError): string {
    const header = renderHeader(error);
    const content = errorContentRenderers[error.type]?.(error) ?? '';
    const location = renderLocation(error);
    return /*html*/`${header}${content}${location}`;
}
