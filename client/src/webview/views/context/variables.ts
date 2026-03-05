import { LJVariable } from "../../../types/context";
import { getOriginalVariableName } from "../../utils";
import { renderToggleSection } from "../sections";

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
                                <td><code>${variable.type}</code></td>
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
    const variableName = getOriginalVariableName(variable.name);
    const refinement = variable.refinement !== "true" ? variable.refinement.replace("==", "=") : variable.name
    const offset = variable.position.lineStart === variable.position.lineEnd && variable.position.colStart === variable.position.colEnd ? variableName.length : 0;
    return /*html*/`
        <div class="context-variable">
            <button
                class="context-variable-btn"
                data-start-line="${variable.position.lineStart}"
                data-start-column="${variable.position.colStart}"
                data-end-line="${variable.position.lineEnd}"
                data-end-column="${variable.position.colEnd + offset}"
            ><code>${refinement}</code>
            </button>
            ${variable.failingRefinement ? /*html*/`<code class="failing-refinement">⊢ ${variable.failingRefinement}</code>` : ''}
        </div>`;
}
