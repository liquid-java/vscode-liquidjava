import { LJGhost } from "../../../types/context";
import { getSimpleName } from "../../utils";
import { renderHighlightedInlineExpression } from "../../highlighting";
import { renderToggleSection } from "../sections";

function formatGhost(ghost: LJGhost): string {
    return `${ghost.returnType} ${ghost.name}(${ghost.parameterTypes.map(getSimpleName).join(', ')})`;
}

export function renderContextGhosts(ghosts: LJGhost[], isExpanded: boolean): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Ghosts', 'context-ghosts', isExpanded)}
            <div id="context-ghosts" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${ghosts.length > 0 ? /*html*/`
                <table>
                    <tbody>
                        ${ghosts.map(ghost => /*html*/`
                            <tr>
                                <td><code>${renderHighlightedInlineExpression(formatGhost(ghost))}</code></td>
                                <td><code>${ghost.isState ? 'state' : 'ghost'}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No ghosts or states declared in the current file</p>'}
            </div>
        </div>
    `;
}
