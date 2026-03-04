import { extension } from "../state";
import { LJContext, Selection, LJVariable } from "../types/context";
import { getOriginalVariableName } from "../utils/utils";

export function handleContext(context: LJContext) {
    extension.context = context;
}

export function updateContextWithSelection(selection: Selection) {
    const variablesInScope = getVariablesInScope(extension.file, selection) || [];
    const instanceVariables = filterInstanceVariables(extension.context.instanceVars || [], variablesInScope);
    const globalVariables = extension.context.globalVars || [];
    const visibleInstanceVariables = getVisibleVariables(instanceVariables, extension.file, selection);
    const allVars = sortVariables(filterDuplicateVariables([...variablesInScope, ...globalVariables, ...visibleInstanceVariables]));
    extension.context.varsInScope = variablesInScope;
    extension.context.allVars = allVars;
}

// Gets the variables in scope for a given file and position
// Returns null if position not in any scope
export function getVariablesInScope(file: string, selection: Selection): LJVariable[] | null {
    // get variables in file
    const fileVars = extension.context.vars[file];
    if (!fileVars) return null;
    const normalizedSelection = normalizeSelection(selection);

    // get variables in the current scope based on the selection
    let mostSpecificScope: string | null = null;
    let minScopeSize = Infinity;

    // find the most specific scope that contains the selection
    for (const scope of Object.keys(fileVars)) {
        const scopeSelection = parseScopeString(scope);
        if (isSelectionWithinAnother(normalizedSelection, scopeSelection)) {
            const scopeSize = (scopeSelection.endLine - scopeSelection.startLine) * 10000 + (scopeSelection.endColumn - scopeSelection.startColumn);
            if (scopeSize < minScopeSize) {
                mostSpecificScope = scope;
                minScopeSize = scopeSize;
            }
        }
    }
    if (mostSpecificScope === null)
        return null;

    // filter variables to only include those that are reachable based on their position
    const variablesInScope = fileVars[mostSpecificScope];
    const reachableVariables = getVisibleVariables(variablesInScope, file, normalizedSelection);
    const visibleVariables = reachableVariables.filter(v => !v.name.includes("this#"));
    return visibleVariables;
}

function getVisibleVariables(variables: LJVariable[], file: string, selection: Selection, useAnnotationPositions: boolean = false): LJVariable[] {
    const isCollapsedSelection =
        selection.startLine === selection.endLine &&
        selection.startColumn === selection.endColumn;

    return variables.filter((variable) => {
        if (variable.placementInCode?.position.file !== file) return false; // variable is not in the current file
       
        const placement = variable.placementInCode?.position;
       
        // single point cursor
        if (isCollapsedSelection) {
            const position = useAnnotationPositions ? variable.annPosition || placement : placement;
            if (!position || variable.isParameter) return true; // if is parameter we need to access it even if it's declared after the selection (for method and parameter refinements)

            // variable was declared before the cursor line or its in the same line but before the cursor column
            return (
                position.line < selection.startLine ||
                (position.line === selection.startLine && position.column + 1 <= selection.startColumn)
            );
        }
        // range selection, filter variables that are only within the selection
        const varSelection: Selection = { startLine: placement.line, startColumn: placement.column, endLine: placement.line, endColumn: placement.column }
        return isSelectionWithinAnother(varSelection, selection);
    });
}

// Normalizes the selection to ensure start is before end
function normalizeSelection(selection: Selection): Selection {
    const startsBeforeEnds =
        selection.startLine < selection.endLine ||
        (selection.startLine === selection.endLine && selection.startColumn <= selection.endColumn);

    if (startsBeforeEnds) return selection;

    return {
        startLine: selection.endLine,
        startColumn: selection.endColumn,
        endLine: selection.startLine,
        endColumn: selection.startColumn,
    };
}

function parseScopeString(scope: string): Selection {
    const [start, end] = scope.split("-");
    const [startLine, startColumn] = start.split(":").map(Number);
    const [endLine, endColumn] = end.split(":").map(Number);
    return { startLine, startColumn, endLine, endColumn };
}

function isSelectionWithinAnother(selection: Selection, another: Selection): boolean {
    const startsWithin = selection.startLine > another.startLine || 
        (selection.startLine === another.startLine && selection.startColumn >= another.startColumn);
    const endsWithin = selection.endLine < another.endLine || 
        (selection.endLine === another.endLine && selection.endColumn <= another.endColumn);
    return startsWithin && endsWithin;
}

function filterDuplicateVariables(variables: LJVariable[]): LJVariable[] {
    const uniqueVariables: Map<string, LJVariable> = new Map();
    for (const variable of variables) {
        if (!uniqueVariables.has(variable.name)) {
            uniqueVariables.set(variable.name, variable);
        }
    }
    return Array.from(uniqueVariables.values());
}

function sortVariables(variables: LJVariable[]): LJVariable[] {
    // sort by position or name
    return variables.sort((left, right) => {
        const leftPosition = left.placementInCode?.position
        const rightPosition = right.placementInCode?.position

        if (!leftPosition && !rightPosition) return compareVariableNames(left, right);
        if (!leftPosition) return 1;
        if (!rightPosition) return -1;
        if (getOriginalVariableName(left.name) === "ret") return 1;
        if (getOriginalVariableName(right.name) === "ret") return -1;
        if (leftPosition.line !== rightPosition.line) return leftPosition.line - rightPosition.line;
        if (leftPosition.column !== rightPosition.column) return leftPosition.column - rightPosition.column;

        return compareVariableNames(left, right);
    });
}

function compareVariableNames(a: LJVariable, b: LJVariable): number {
    return getOriginalVariableName(a.name).localeCompare(getOriginalVariableName(b.name));
}

function filterInstanceVariables(instanceVars: LJVariable[], variablesInScope: LJVariable[]): LJVariable[] {
    return instanceVars.filter(v => variablesInScope.some(s => s.name === getOriginalVariableName(v.name)));
}