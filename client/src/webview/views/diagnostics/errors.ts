import { renderDiagnosticDataAttributes, renderExpressionSection, renderDiagnosticHeader, renderCustomSection, renderLocation, renderDiagnosticContextButton } from "../sections";
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
} from "../../../types/diagnostics";
import { renderCopyDiagnosticButton } from "./diagnostics";

export function renderErrors(errors: LJError[]): string {
    return /*html*/`
        <ul>
            ${errors.map((error, index) => {
                return /*html*/`
                <li class="diagnostic-item error-item" ${renderDiagnosticDataAttributes(error)}>
                    ${renderDiagnosticContextAction(error)}
                    ${renderCopyDiagnosticButton('error', index)}
                    ${renderError(error)}
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

export function renderError(error: LJError): string {
    const message = error.type === 'refinement-error' || error.type === 'state-refinement-error' ? error.customMessage : error.message;
    const header = renderDiagnosticHeader(error.title, message || '');
    const content = (errorContentRenderers[error.type] as (error: LJError) => string)?.(error) || '';
    const location = renderLocation(error);
    return /*html*/`${header}${content}${location}`;
}

function renderDiagnosticContextAction(error: LJError): string {
    if (error.type !== 'refinement-error' && error.type !== 'state-refinement-error') return "";
    return renderDiagnosticContextButton(error.position);
}
