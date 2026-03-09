import { LJVariable } from "../../../types/context";
import { LJDiagnostic, RefinementError, StateRefinementError } from "../../../types/diagnostics";
import { escapeHtml, getSimpleName } from "../../utils";
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
    const diagnostic = getMatchingDiagnostic(variable, diagnostics);
    return /*html*/`
        <div class="context-variable">
            ${renderVariableHighlightButton(variable.position, `${variable.name} == ${variable.refinement}`)}
            ${diagnostic ? /*html*/`<code class="failing-refinement" data-tooltip="${escapeHtml(diagnostic.message)}">⊢ ${diagnostic.expected}</code>` : ''}
        </div>`;
}

function getMatchingDiagnostic(variable: LJVariable, diagnostics: LJDiagnostic[]): { expected: string, message: string} | null {
    // find refinement or state refinement error that matches the variable's position
    const matchingDiagnostic = diagnostics.find(d => {
        if (!d.position || !variable.position) return false;
        if (d.type !== 'refinement-error' && d.type !== 'state-refinement-error') return false;
        return JSON.stringify(d.position) === JSON.stringify(variable.position);
    }) as RefinementError | StateRefinementError | undefined;
    if (!matchingDiagnostic) return null;

    // get the expected type from diagnostic
    const expected = matchingDiagnostic.type == "refinement-error" ? matchingDiagnostic.expected.value : matchingDiagnostic.expected;
    
    // only include those that mention the variable 
    return expected?.includes(variable.name)  ? { expected, message: `${matchingDiagnostic.title}: ${matchingDiagnostic.message}` } : null;
}