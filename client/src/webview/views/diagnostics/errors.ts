import { renderDiagnosticDataAttributes, renderExpressionSection, renderDiagnosticHeader, renderCustomSection, renderLocation, renderDiagnosticContextButton, renderDiagnosticStateMachineButton, renderHints } from "../sections";
import { renderCounterexample } from "./counterexample";
import { renderVCImplication } from "./vc-implications";
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
import { getDiagnosticKey } from "../../diagnostic-reveal";

export function renderErrors(errors: LJError[]): string {
    return /*html*/`
        <ul>
            ${errors.map((error, index) => {
                return /*html*/`
                <li class="diagnostic-item error-item" ${renderDiagnosticDataAttributes(error)}>
                    ${renderError(error, /*html*/`
                        ${renderDiagnosticStateMachineAction(error, index)}
                        ${renderDiagnosticContextAction(error)}
                        ${renderCopyDiagnosticButton('error', index)}
                    `)}
                </li>
            `;
            }).join("")}
        </ul>
    `;
}

type ErrorRendererMap = { [E in LJError as E['type']]: (error: E) => string };

const errorContentRenderers: ErrorRendererMap = {
    'refinement-error': (e: RefinementError) => /*html*/ `
        ${renderExpressionSection('Expected', e.expected)}
        ${renderCustomSection('Found', renderVCImplication(e, e.found))}
        ${e.counterexample.assignments.length > 0
            ? renderCustomSection('Counterexample', renderCounterexample(e.counterexample))
            : ''}
    `,
    'state-refinement-error': (e: StateRefinementError) => /*html*/ `
        ${renderExpressionSection('Expected', e.expected)}
        ${renderCustomSection('Found', renderVCImplication(e, e.found))}
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

/**
 * Renders the error content
 * @param error The error to render
 * @param actions Actions shown on the line of the error title
 */
export function renderError(error: LJError, actions = ''): string {
    const message = error.type === 'refinement-error' || error.type === 'state-refinement-error' ? error.customMessage : error.message;
    const header = renderDiagnosticHeader(error.title, message || '', actions);
    const content = (errorContentRenderers[error.type] as (error: LJError) => string)?.(error) || '';
    const hint = renderHints(error.hints, getDiagnosticKey(error));
    const location = renderLocation(error);
    return /*html*/`${header}${content}${hint}${location}`;
}

function renderDiagnosticContextAction(error: LJError): string {
    if (error.type !== 'refinement-error' && error.type !== 'state-refinement-error') return "";
    return renderDiagnosticContextButton(error.position);
}

function renderDiagnosticStateMachineAction(error: LJError, index: number): string {
    if (error.type !== 'state-refinement-error' || error.stateMachines.length === 0) return "";
    return renderDiagnosticStateMachineButton(index);
}
