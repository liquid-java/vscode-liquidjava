import { LJVariable } from "../../../types/context";
import { RefinementMismatchError } from "../../../types/diagnostics";
import { escapeHtml, getSimpleName } from "../../utils";
import { renderLocationLink, renderToggleSection, renderVariableHighlightButton } from "../sections";

export function renderContextVariables(variables: LJVariable[], isExpanded: boolean, errorAtCursor?: RefinementMismatchError): string {
    const expected  = errorAtCursor ? errorAtCursor.type == "refinement-error" ? errorAtCursor.expected.value : errorAtCursor.expected : undefined;
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Variables', 'context-vars', isExpanded)}
            <div id="context-vars" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${variables.length > 0 ? /*html*/`
                    <table>
                        <tbody>
                            ${variables.map(variable => /*html*/`
                                <tr>
                                    <td>${renderVariableHighlightButton(variable.position, variable.refinement)}</td>
                                    <td><code>${getSimpleName(variable.type)}</code></td>
                                </tr>
                            `).join('')}
                            ${errorAtCursor ? /*html*/`<tr><td><code class="failing-refinement" data-tooltip="${escapeHtml(errorAtCursor.title)}">${renderLocationLink(errorAtCursor.position, '⊢ ' + expected)}</code></td><td></td></tr>` : ''}
                        </tbody>
                    </table>
                `: '<p>No variables declared at the cursor position</p>'}
            </div>
        </div>
    `;
}
