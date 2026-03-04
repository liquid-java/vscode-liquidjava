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
    const position = variable.placementInCode.position; // TODO: handle cases where we don't really have the correct position for the variable
    return /*html*/`
        <button
            class="highlight-btn"
            data-start-line="${position.line}"
            data-start-column="${position.column}"
            data-end-line="${position.line}"
            data-end-column="${position.column + variableName.length}"
            ${variableName === "ret" ? 'disabled' : ''}
        ><code>${refinement}</code></button>`;
}
