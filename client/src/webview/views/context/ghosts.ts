import { LJGhost } from "../../../types/context";
import { renderToggleSection } from "../sections";

export function renderContextGhosts(ghosts: LJGhost[], isExpanded: boolean): string {
    return /*html*/`
        <div class="context-section">
            ${renderToggleSection('Ghosts', 'context-ghosts', isExpanded)}
            <div id="context-ghosts" class="context-section-content ${isExpanded ? '' : 'collapsed'}">
                ${ghosts.length > 0 ? /*html*/`
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Parameters</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ghosts.map(ghost => /*html*/`
                            <tr>
                                <td><code>${ghost.returnType} ${ghost.name}</code></td>
                                <td><code>${ghost.isState ? 'State' : 'Ghost'}</code></td>
                                <td><code>${ghost.parameterTypes.join(', ') || '-'}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No ghosts available in the current file.</p>'}
            </div>
        </div>
    `;
}