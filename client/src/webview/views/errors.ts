import { renderHeader, renderLocation, renderSection, renderCustomSection, renderShowAllButton, renderTranslationTable } from "./sections";
import { renderDerivationNode } from "./derivation-nodes";
import {
    ArgumentMismatchError,
    InvalidRefinementError,
    LJError,
    NotFoundError,
    RefinementError,
    StateConflictError,
    StateRefinementError,
    SyntaxError,
    TranslationTable,
} from "../../types";

export function getErrorsView(errors: LJError[], showAll: boolean, currentFile: string | undefined, expandedErrors: Set<number>): string {
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
                    ${displayDiagnostics.map((error, index) => {
                        const errorIndex = errors.indexOf(error);
                        const isExpanded = expandedErrors.has(errorIndex);
                        return /*html*/`
                        <li class="diagnostic-item error-item">
                            ${renderError(error, errorIndex, isExpanded)}
                        </li>
                    `;
                    }).join("")}
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

export function renderError(error: LJError, errorIndex: number, isExpanded: boolean): string {
    const header = renderHeader(error);
    const content = errorContentRenderers[error.type]?.(error) ?? '';
    const location = renderLocation(error);
    const extra = renderExtra(error, errorIndex, isExpanded);
    return /*html*/`${header}${content}${location}${extra}`;
}

function renderExtra(error: LJError, errorIndex: number, isExpanded: boolean): string {
    const button = /*html*/`
        <button class="show-more-button" data-error-index="${errorIndex}" title="Toggle show extra information about the diagnostic">
            ${isExpanded ? '↑' : '↓'}
        </button>
    `;
    
    let extra = "";
    if (error.hasOwnProperty('translationTable')) {
        extra += renderTranslationTable((error as any).translationTable as TranslationTable);
    }
    return extra ? isExpanded ? /*html*/`${button}<div class="extra-content">${extra}</div>` : button : "";
}