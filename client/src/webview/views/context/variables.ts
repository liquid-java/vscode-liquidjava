import { LJVariable } from "../../../types/context";
import { getOriginalVariableName, getSimpleName } from "../../utils";
import { renderToggleSection, renderVariableHighlightButton } from "../sections";

export function renderContextVariables(variables: LJVariable[], isExpanded: boolean): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Variables', 'context-vars', isExpanded)}
            <div id="context-vars" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${variables.length > 0 ? /*html*/`
                <table>
                    <tbody>
                        ${variables.map(variable => /*html*/`
                            <tr>
                                <td>${renderVariable(variable)}</td>
                                <td><code>${getSimpleName(variable.type)}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                `: '<p>No variables available in the current position.</p>'}
            </div>
        </div>
    `;
}

function renderVariable(variable: LJVariable): string {
    return /*html*/`
        <div class="context-variable">
            ${renderVariableHighlightButton(variable.position, variable.refinement)}
            ${variable.failingRefinement ? /*html*/`<code class="failing-refinement">⊢ ${variable.failingRefinement}</code>` : ''}
        </div>`;
}