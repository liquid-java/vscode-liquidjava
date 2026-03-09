import { LJContext } from "../../../types/context";
import { LJDiagnostic, SourcePosition } from "../../../types/diagnostics";
import { renderMainHeader } from "../sections";
import { renderContextAliases } from "./aliases";
import { renderContextGhosts } from "./ghosts";
import { renderContextVariables } from "./variables";

export type ContextSectionState = {
    aliases: boolean;
    ghosts: boolean;
    vars: boolean;
}

export function renderContextView(context: LJContext, currentFile: string, sectionState: ContextSectionState, diagnostics: LJDiagnostic[]): string {
    if (!context || !currentFile) return "";

    const allVars = context.allVars;
    const ghosts = context.ghosts.filter(ghost => ghost.file === currentFile);
    const aliases = context.aliases;
    const total = allVars.length + ghosts.length + aliases.length;
    return /*html*/`
        <div>
            ${renderMainHeader("", 'context')}
            ${total === 0
                ? '<p>No context information available.</p>'
                : `${renderContextAliases(aliases, sectionState.aliases)}
                   ${renderContextGhosts(ghosts, sectionState.ghosts)}
                   ${renderContextVariables(allVars, sectionState.vars, diagnostics)}
            `}
        </div>
    `;
}
