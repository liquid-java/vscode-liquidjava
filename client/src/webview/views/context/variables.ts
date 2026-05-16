import { LJVariable } from "../../../types/context";
import { RefinementMismatchError } from "../../../types/diagnostics";
import { renderToggleSection, renderHighlightButton } from "../sections";

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
                                <th>Variable</th>
                                <th>Refinement</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${variables.map(variable => /*html*/`
                                <tr>
                                    <td>${renderHighlightButton(variable.position, variable.name)}</td>
                                    <td><code>${variable.refinement}</code></td>
                                </tr>
                            `).join('')}
                            ${errorAtCursor ? /*html*/`
                                <tr><td class="failing-refinement" colspan="2">${renderHighlightButton(errorAtCursor.position, '⊢ ' + expected, true)}</td></tr>`
                            : ''}
                        </tbody>
                    </table>
                `: '<p>No variables declared at the cursor position</p>'}
            </div>
        </div>
    `;
}
