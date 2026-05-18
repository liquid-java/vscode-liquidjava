import { renderDiagnosticDataAttributes, renderExpressionSection, renderDiagnosticHeader, renderSection, renderCustomSection, renderTranslationTable, renderLocation,  } from "../sections";
import { renderDerivationNode } from "./derivation-nodes";
import type {
    ArgumentMismatchError,
    CustomError,
    IllegalConstructorTransitionError,
    InvalidRefinementError,
    LJError,
    NotFoundError,
    RefinementError,
    StateConflictError,
    StateRefinementError,
    SyntaxError,
    TranslationTable,
} from "../../../types/diagnostics";
import { renderCopyDiagnosticButton } from "./diagnostics";

export function renderErrors(errors: LJError[], expandedErrors: Set<number>): string {
    return /*html*/`
        <ul>
            ${errors.map((error, index) => {
                const isExpanded = expandedErrors.has(index);
                return /*html*/`
                <li class="diagnostic-item error-item" ${renderDiagnosticDataAttributes(error)}>
                    ${renderCopyDiagnosticButton('error', index)}
                    ${renderError(error, index, isExpanded)}
                </li>
            `;
            }).join("")}
        </ul>
    `;
}

type ErrorRendererMap = { [E in LJError as E['type']]: (error: E) => string };

const errorContentRenderers: ErrorRendererMap = {
    'refinement-error': (e: RefinementError) => /*html*/ `
        ${renderCustomSection('Expected', renderDerivationNode(e, e.expected, 'expected'))}
        ${renderCustomSection('Found', renderDerivationNode(e, e.found, 'found'))}
        ${e.counterexample ? renderExpressionSection('Counterexample', e.counterexample) : ''}
    `,
    'state-refinement-error': (e: StateRefinementError) => /*html*/ `
        ${renderCustomSection('Expected', renderDerivationNode(e, e.expected, 'expected'))}
        ${renderCustomSection('Found', renderDerivationNode(e, e.found, 'found'))}
    `,
    'invalid-refinement-error': (e: InvalidRefinementError) => /*html*/ `
        ${renderExpressionSection('Refinement', e.refinement)}
    `,
    'not-found-error': (e: NotFoundError) => /*html*/ `
        ${renderExpressionSection(e.kind, e.name)}
    `,
    'state-conflict-error': (e: StateConflictError) => /*html*/ `
        ${renderExpressionSection('State', e.state)}
    `,
    'syntax-error': (e: SyntaxError) => /*html*/ `
        ${renderExpressionSection('Refinement', e.refinement)}
    `,
    'argument-mismatch-error': (e: ArgumentMismatchError) => /*html*/ `
        ${renderExpressionSection('Refinement', e.refinement)}
    `,
    'illegal-constructor-transition-error': (_: IllegalConstructorTransitionError) => "null",
    'custom-error': (_: CustomError) => "",
};

export function renderError(error: LJError, errorIndex: number, isExpanded: boolean): string {
    const message = error.type === 'refinement-error' || error.type === 'state-refinement-error' ? error.customMessage : error.message;
    const header = renderDiagnosticHeader(error.title, message || '');
    const content = (errorContentRenderers[error.type] as (error: LJError) => string)?.(error) || '';
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
    if (Object.prototype.hasOwnProperty.call(error, 'translationTable')) {
        extra += renderTranslationTable((error as any).translationTable as TranslationTable);
    }
    return extra ? isExpanded ? /*html*/`${button}<div class="extra-content">${extra}</div>` : button : "";
}
