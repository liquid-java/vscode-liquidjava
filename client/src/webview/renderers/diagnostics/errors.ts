import { renderHeader, renderLocation, renderSection } from "./utils";
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

export function renderError(error: LJError): string {
    const header = renderHeader(error);
    const location = renderLocation(error);
    switch (error.type) {
        case 'refinement-error': {
            const e = error as RefinementError;
            return /*html*/`
                ${header}
                ${renderSection('Expected', `<pre>${e.expected.value}</pre>`)}
                ${renderSection('Found', renderDerivationNode(e, e.found))}
                ${location}
            `;
        }
        case 'state-refinement-error': {
            const e = error as StateRefinementError;
            return `${header}${renderSection('Expected', `<pre>${e.expected}</pre>`)}${renderSection('Found', `<pre>${e.found}</pre>`)}${location}`;
        }
        case 'invalid-refinement-error': {
            const e = error as InvalidRefinementError;
            return `${header}${renderSection('Refinement', `<pre>"${e.refinement}"</pre>`)}${location}`;
        }
        case 'not-found-error': {
            const e = error as NotFoundError;
            const content = `<p>${e.kind} <b>${e.name}</b> not found</p>`;
            return `<h3>${error.title}</h3><div class="diagnostic-header">${content}</div>${location}`;
        }
        case 'state-conflict-error': {
            const e = error as StateConflictError;
            return `${header}${renderSection('State', `<pre>${e.state}</pre>`)}${location}`;
        }
        case 'syntax-error': {
            const e = error as SyntaxError;
            return `${header}${renderSection('Refinement', `<pre>"${e.refinement}"</pre>`)}${location}`;
        }
        case 'argument-mismatch-error': {
            const e = error as ArgumentMismatchError;
            return `${header}${renderSection('Refinement', `<pre>"${e.refinement}"</pre>`)}${location}`;
        }
        default:
            return `${header}${location}`;
    }
}
function renderToggleButton(showAll: boolean) {
    throw new Error("Function not implemented.");
}

