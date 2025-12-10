import { renderHeader, renderLocation, renderSection } from "./utils";
import {
    InvalidRefinementError,
    LJError,
    NotFoundError,
    RefinementError,
    StateConflictError,
    StateRefinementError,
} from "../../../types";
import { renderDerivationNode } from "./derivation-nodes";

export function getErrorsView(errors: LJError[], totalErrors: number): string {
    return /*html*/`
        <div>
            <h2>Failed Verification</h2>
            <p>${totalErrors} error${totalErrors > 1 ? 's were' : ' was'} found by the LiquidJava verifier.</p>
            <div class="content">
                <ul>
                    ${errors.map((error) => /*html*/`
                        <li class="diagnostic-item error-item">
                            ${renderError(error)}
                        </li>
                    `).join("")}
                </ul>
            </div>
        </div>
    `;
}

export function renderError(error: LJError): string {
    const header = renderHeader(error);
    const location = renderLocation(error);
    
    switch (error.type) {
        case 'illegal-constructor-transition-error':
            return `${header}${location}`;
        case 'invalid-refinement-error': {
            const e = error as InvalidRefinementError;
            return `${header}${renderSection('Refinement', `<pre>"${e.refinement}"</pre>`)}${location}`;
        }
        case 'not-found-error': {
            const e = error as NotFoundError;
            const content = `<p>${e.kind} <b>${e.name}</b> not found</p>`;
            return `<h3>${error.title}</h3><div class="diagnostic-header">${content}</div>${location}`;
        }
        case 'refinement-error':
            const e = error as RefinementError;
            return /*html*/`
                ${header}
                <pre>${e.expected/*renderSection('Expected', renderDerivationNode(e, e.expected))*/} </pre>
                ${renderSection('Found', renderDerivationNode(e, e.found))}
                ${location}
            `;
        case 'state-conflict-error': {
            const e = error as StateConflictError;
            return `${header}${renderSection('State', `<pre>${e.state}</pre>`)}${location}`;
        }
        case 'state-refinement-error': {
            const e = error as StateRefinementError;
            return `${header}${renderSection('Expected', `<pre>${e.expected}</pre>`)}${renderSection('Found', `<pre>${e.found}</pre>`)}${location}`;
        }
    }
}
