import { renderDiagnosticHeader, renderLocation, renderSection, renderCustomSection, renderTranslationTable,  } from "../sections";
import { renderDerivationNode } from "./derivation-nodes";
import type {
    ArgumentMismatchError,
    InvalidRefinementError,
    LJError,
    NotFoundError,
    RefinementError,
    StateConflictError,
    StateRefinementError,
    SyntaxError,
    TranslationTable,
} from "../../../types/diagnostics";

export function renderErrors(errors: LJError[], expandedErrors: Set<number>): string {
    return /*html*/`
        <ul>
            ${errors.map(error => {
                const errorIndex = errors.indexOf(error);
                const isExpanded = expandedErrors.has(errorIndex);
                return /*html*/`
                <li class="diagnostic-item error-item">
                    ${renderError(error, errorIndex, isExpanded)}
                </li>
            `;
            }).join("")}
        </ul>
    `;
}

const errorContentRenderers: Partial<Record<LJError['type'], (error: LJError) => string>> = {
    'refinement-error': (e: RefinementError) => /*html*/`
        ${e.customMessage ? renderSection('Message', e.customMessage) : ''}
        ${renderCustomSection('Expected', renderDerivationNode(e, e.expected, 'expected'))}
        ${renderCustomSection('Found', renderDerivationNode(e, e.found, 'found'))}
        ${e.counterexample ? renderSection('Counterexample', e.counterexample) : ''}
    `,
    'state-refinement-error': (e: StateRefinementError) => /*html*/`
        ${e.customMessage ? renderSection('Message', e.customMessage) : ''}
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
    const header = renderDiagnosticHeader(error);
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