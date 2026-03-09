import { LJAlias } from "../../../types/context";
import { getSimpleName } from "../../utils";
import { renderToggleSection } from "../sections";

export function renderContextAliases(aliases: LJAlias[], isExpanded: boolean): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Aliases', 'context-aliases', isExpanded)}
            <div id="context-aliases" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${aliases.length > 0 ? /*html*/`
                <table>
                    <tbody>
                        ${aliases.map(alias => /*html*/`
                            <tr>
                                <td>
                                    <code>
                                        ${alias.name}(${alias.parameters.map((parameter, index) => `${getSimpleName(alias.types[index])} ${parameter}`).join(", ")}) { ${alias.predicate} }
                                    </code>
                                </td>
                                <td><code>alias</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No aliases declared in the current project.</p>'}
            </div>
        </div>
    `;
}