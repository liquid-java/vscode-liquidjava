import { extension } from "../state";
import { ContextHistory, Selection, Variable } from "../types/context";

export function handleContextHistory(contextHistory: ContextHistory) {
    extension.contextHistory = contextHistory;
}

export function getVariablesInScope(file: string, selection: Selection): Variable[] {
    if (!extension.contextHistory || !selection || !file) return [];

    // get variables in file
    const fileVars = extension.contextHistory.vars[file];
    if (!fileVars) return [];

    // get variables in the current scope based on the selection
    let mostSpecificScope: string | null = null;
    let minScopeSize = Infinity;

    // find the most specific scope that contains the selection
    for (const scope of Object.keys(fileVars)) {
        const scopeSelection = parseScopeString(scope);
        if (isSelectionWithinScope(selection, scopeSelection)) {
            const scopeSize = (scopeSelection.endLine - scopeSelection.startLine) * 10000 + (scopeSelection.endColumn - scopeSelection.startColumn);
            if (scopeSize < minScopeSize) {
                mostSpecificScope = scope;
                minScopeSize = scopeSize;
            }
        }
    }
    const variablesInScope = mostSpecificScope ? fileVars[mostSpecificScope] : [];

    // filter variables to only include those that are reachable based on their position
    const reachableVariables = getReachableVariables(variablesInScope, selection);
    return reachableVariables.filter(v => !v.name.startsWith("this#"))
}

function parseScopeString(scope: string): Selection {
    const [start, end] = scope.split("-");
    const [startLine, startColumn] = start.split(":").map(Number);
    const [endLine, endColumn] = end.split(":").map(Number);
    return { startLine, startColumn, endLine, endColumn };
}

function isSelectionWithinScope(selection: Selection, scope: Selection): boolean {
    const startsWithin = selection.startLine > scope.startLine || 
        (selection.startLine === scope.startLine && selection.startColumn >= scope.startColumn);
    const endsWithin = selection.endLine < scope.endLine || 
        (selection.endLine === scope.endLine && selection.endColumn <= scope.endColumn);
    return startsWithin && endsWithin;
}

function getReachableVariables(variables: Variable[], selection: Selection): Variable[] {
    return variables.filter((variable) => {
        const placement = variable.placementInCode?.position;
        if (!placement) return true;
        return placement.line < selection.startLine || (placement.line === selection.startLine && placement.column <= selection.startColumn);
    });
}