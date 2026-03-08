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
    // find refinement or state refinement error that matches the variable's position
    const matchingDiagnostic = diagnostics.find((d): d is RefinementError | StateRefinementError => {
        if (!d.position || !variable.position) return false;
        if (d.type !== 'refinement-error' && d.type !== 'state-refinement-error') return false;
        return JSON.stringify(d.position) === JSON.stringify(variable.position);
    });
    if (!matchingDiagnostic) return null;

    // get the expected type from diagnostic
    const expected = matchingDiagnostic.type === 'refinement-error'
        ? matchingDiagnostic.expected.value
        : matchingDiagnostic.expected;
    
    // only include those that mention the variable or "(this)"
    return expected?.includes(variable.name) || expected?.includes('(this)') ? expected : null;
}