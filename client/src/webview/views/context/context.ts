import { LJContext } from "../../../types/context";
import { renderLocationLink, renderMainHeader } from "../sections";

export function renderContextView(context: LJContext, currentFile: string): string {
    if (!context || !currentFile) return "";

    const varsInScope = context.allVars || [];
    const ghosts = context.ghosts[currentFile] || [];
    const aliases = context.aliases || [];
    const total = varsInScope.length + ghosts.length + aliases.length;
    return /*html*/`
        <div>
            ${renderMainHeader("", 'context')}
            ${total === 0 ? '<p>No context information available for the current position.</p>' : ''}
           
                <div class="context-section">
                    <h2>Variables in Scope</h2>
                    <br />
                     ${varsInScope.length > 0 ? /*html*/`
                    <table>
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th>Refinement</th>
                                <th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${varsInScope.map(variable => /*html*/`
                                <tr>
                                    <td><code>${variable.type} ${variable.name}</code></td>
                                    <td><code>${variable.refinement}</code></td>
                                    <td><code>${renderLocationLink(variable.placementInCode.position)}</code></td>                                   
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `: '<p>No variables available in the current position.</p>'}
                </div>
           
           
        </div>
    `;
}

 // ${ghosts.length > 0 ? /*html*/`
//     <div class="context-section">
//         <h2>Ghosts</h2>
//         <ul>
//             ${ghosts.map(ghost => /*html*/`<li><code>${ghost.name}</code></li>`).join('')}
//         </ul>
//     </div>
// ` : ''}
// ${aliases.length > 0 ? /*html*/`
//     <div class="context-section">
//         <h2>Aliases</h2>
//         <ul>
//             ${aliases.map(alias => /*html*/`<li><code>${alias.name}</code></li>`).join('')}
//         </ul>
//     </div>
// ` : ''}