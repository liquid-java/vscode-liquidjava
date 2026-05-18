import { LJVariable } from "../../../types/context";
import { RefinementMismatchError } from "../../../types/diagnostics";
import { escapeHtml, getSimpleName } from "../../utils";
import { renderToggleSection, renderHighlightButton, renderDiagnosticRevealButton } from "../sections";

export function renderContextVariables(variables: LJVariable[], isExpanded: boolean, errorAtCursor?: RefinementMismatchError): string {
    const expected  = errorAtCursor ? errorAtCursor.type == "refinement-error" ? errorAtCursor.expected.value : errorAtCursor.expected : undefined;
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Variables', 'context-vars', isExpanded)}
            <div id="context-vars" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${variables.length > 0 ? /*html*/`
                    <table class="context-variables-table">
                        <colgroup>
                            <col class="context-variables-column">
                            <col class="context-refinement-column">
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Refinement</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${variables.map(variable => /*html*/`
                                <tr>
                                    <td>${renderHighlightButton(variable.position!, variable.refinement)}</td>
                                    <td><code>${escapeHtml(getSimpleName(variable.type))}</code></td>
                                </tr>
                            `).join('')}
                            ${errorAtCursor ? renderFailingRefinement(errorAtCursor, expected!) : ''}
                        </tbody>
                    </table>
                `: '<p>No variables declared at the cursor position</p>'}
            </div>
        </div>
    `;
}

function renderFailingRefinement(errorAtCursor: RefinementMismatchError, expected: string): string {
    return /*html*/`<tr><td><code class="failing-refinement" data-tooltip="${escapeHtml(errorAtCursor.title)}">${renderHighlightButton(errorAtCursor.position!, '⊢ ' + expected, true)}</code></td><td></td></tr>`;
}