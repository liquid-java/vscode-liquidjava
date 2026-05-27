import { LJVariable } from "../../../types/context";
import { RefinementMismatchError } from "../../../types/diagnostics";
import { renderHighlightedInlineExpression } from "../../highlighting";
import { escapeHtml, getSimpleName } from "../../utils";
import { renderToggleSection, renderHighlightButton, renderDiagnosticRevealButton } from "../sections";

export function renderContextVariables(variables: LJVariable[], isExpanded: boolean, errorAtCursor?: RefinementMismatchError): string {
    const expected = errorAtCursor ? errorAtCursor.expected.value : undefined;
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
                                    <td>${renderHighlightButton(variable.position!, getSimpleName(variable.name))}</td>
                                    <td><code>${renderHighlightedInlineExpression(variable.refinement)}</code></td>
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
    return /*html*/`
        <tr>
            <td class="failing-refinement tooltip" colspan="2" data-tooltip="${escapeHtml(errorAtCursor.title)}">
                ${renderDiagnosticRevealButton(errorAtCursor.position!, '⊢ ' + expected)}
            </td>
        </tr>
    `;
}
