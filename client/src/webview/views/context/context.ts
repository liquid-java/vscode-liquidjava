import { LJContext } from "../../../types/context";
import { renderMainHeader } from "../sections";
import { renderContextAliases } from "./aliases";
import { renderContextGhosts } from "./ghosts";
import { renderContextVariables } from "./variables";

export type ContextSectionState = {
    vars: boolean;
    ghosts: boolean;
    aliases: boolean;
}

export function renderContextView(context: LJContext, currentFile: string, sectionState: ContextSectionState): string {
    if (!context || !currentFile) return "";

    const allVars = context.allVars || [];
    const ghosts = context.ghosts[currentFile] || [];
    const aliases = context.aliases || [];
    const total = allVars.length + ghosts.length + aliases.length;
    return /*html*/`
        <div>
            ${renderMainHeader("", 'context')}
            ${total === 0
                ? '<p>No context information available for the current position.</p>'
                : `${renderContextAliases(aliases, sectionState.aliases)}
                   ${renderContextGhosts(ghosts, sectionState.ghosts)}
                   ${renderContextVariables(allVars, sectionState.vars)}
            `}
        </div>
    `;
}
