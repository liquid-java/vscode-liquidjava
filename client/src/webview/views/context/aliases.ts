import { LJAlias } from "../../../types/context";
import { getSimpleName } from "../../utils";
import { renderHighlightedInlineExpression } from "../../highlighting";
import { renderToggleSection } from "../sections";

export function renderContextAliases(aliases: LJAlias[], isExpanded: boolean): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Aliases', 'context-aliases', isExpanded)}
            <div id="context-aliases" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${aliases.length > 0 ? /*html*/`
                <table class="context-aliases-table">
                    <tbody>
                        ${aliases.map(alias => /*html*/`
                            <tr>
                                <td>
                                    <code>
                                        ${renderHighlightedInlineExpression(renderAlias(alias))}
                                    </code>
                                </td>
                                <td><code>alias</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No aliases declared in the project</p>'}
            </div>
        </div>
    `;
}

function renderAlias(alias: LJAlias): string {
    const parameters = alias.parameters
        .map((parameter, index) => `${getSimpleName(alias.types[index])} ${parameter}`)
        .join(", ");

    return `${alias.name}(${parameters}) { ${alias.predicate} }`;
}
