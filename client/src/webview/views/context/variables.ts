import { LJVariable } from "../../../types/context";
import { LJDiagnostic, RefinementError, StateRefinementError } from "../../../types/diagnostics";
import { getOriginalVariableName, getSimpleName } from "../../utils";
import { renderToggleSection, renderVariableHighlightButton } from "../sections";

export function renderContextVariables(variables: LJVariable[], isExpanded: boolean, diagnostics: LJDiagnostic[]): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Variables', 'context-vars', isExpanded)}
            <div id="context-vars" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${variables.length > 0 ? /*html*/`
                <table>
                    <tbody>
                        ${variables.map(variable => /*html*/`
                            <tr>
                                <td>${renderVariable(variable, diagnostics)}</td>
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

function renderVariable(variable: LJVariable, diagnostics: LJDiagnostic[]): string {
    const failingRefinement = getFailingRefinement(variable, diagnostics);
    return /*html*/`
        <div class="context-variable">
            ${renderVariableHighlightButton(variable.position, `${variable.name} == ${variable.refinement}`)}
            ${failingRefinement ? /*html*/`<code class="failing-refinement">⊢ ${failingRefinement}</code>` : ''}
        </div>`;
}

function getFailingRefinement(variable: LJVariable, diagnostics: LJDiagnostic[]): string | null {
    const matchingDiagnostic: RefinementError | StateRefinementError | undefined = diagnostics.find(d => 
        d.position && variable.position &&
        (d.type === 'refinement-error' || d.type === 'state-refinement-error') &&
        JSON.stringify(d.position) === JSON.stringify(variable.position)
    ) as RefinementError | StateRefinementError | undefined;
    return matchingDiagnostic ? matchingDiagnostic.type === 'refinement-error' ? 
          matchingDiagnostic.expected.value : matchingDiagnostic.expected : null;
}