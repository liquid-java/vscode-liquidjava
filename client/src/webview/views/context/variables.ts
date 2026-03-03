import { LJVariable } from "../../../types/context";
import { renderLocationLink, renderToggleSection } from "../sections";

export function renderContextVariables(variables: LJVariable[], isExpanded: boolean): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Variables', 'context-vars', isExpanded)}
            <div id="context-vars" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${variables.length > 0 ? /*html*/`
                <table>
                    <thead>
                        <tr>
                            <th>Variable</th>
                            <th>Refinement</th>
                            <th>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${variables.map(variable => /*html*/`
                            <tr>
                                <td><code>${variable.type} ${variable.name}</code></td>
                                <td><code>${variable.refinement}</code></td>
                                <td>${variable.placementInCode ? `<code>${renderLocationLink(variable.placementInCode.position)}</code>` : '<span>Unknown</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                `: '<p>No variables available in the current position.</p>'}
            </div>
        </div>
    `;
}