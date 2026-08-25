import type { LJContext } from "../../../types/context";
import type { RefinementMismatchError } from "../../../types/diagnostics";
import { renderMainHeader } from "../sections";
import { renderContextAliases } from "./aliases";
import { renderContextGhosts } from "./ghosts";
import { renderContextVariables } from "./variables";

export type ContextSectionState = {
    aliases: boolean;
    ghosts: boolean;
    vars: boolean;
}

export function renderContextView(context: LJContext | undefined, currentFile: string | undefined, sectionState: ContextSectionState, errorAtCursor?: RefinementMismatchError): string {
    const allVars = context?.allVars || [];
    const ghosts = context?.ghosts?.filter(ghost => ghost.file === currentFile) || [];
    const aliases = context?.aliases || [];
    const total = allVars.length + ghosts.length + aliases.length;
    return /*html*/`
        <div>
            ${renderMainHeader("", 'context')}
            ${total === 0
                ? 'No context information available at the cursor position'
                : `${renderContextAliases(aliases, sectionState.aliases)}
                   ${renderContextGhosts(ghosts, sectionState.ghosts)}
                   ${renderContextVariables(allVars, sectionState.vars, errorAtCursor)}
            `}
        </div>
    `;
}
