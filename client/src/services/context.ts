import { extension } from "../state";
import { LJContext, Range, LJVariable } from "../types/context";
import { getOriginalVariableName } from "../utils/utils";

export function handleContext(context: LJContext) {
    extension.context = context;
}

export function updateContext(range: Range) {
    const variablesInScope = getVariablesInScope(extension.file, range) || [];
    const instanceVariables = filterInstanceVariables(extension.context.instanceVars || [], variablesInScope);
    const globalVariables = extension.context.globalVars || [];
    const visibleInstanceVariables = getVisibleVariables(instanceVariables, extension.file, range);
    const allVars = sortVariables(filterDuplicateVariables([...variablesInScope, ...globalVariables, ...visibleInstanceVariables]));
    extension.context.varsInScope = variablesInScope;
    extension.context.allVars = allVars;
}

// Gets the variables in scope for a given file and position
// Returns null if position not in any scope
export function getVariablesInScope(file: string, range: Range): LJVariable[] | null {
    // get variables in file
    const fileVars = extension.context.vars[file];
    if (!fileVars) return null;
    const normalizedRange = normalizeRange(range);

    // get variables in the current scope based on the range
    let mostSpecificScope: string | null = null;
    let minScopeSize = Infinity;

    // find the most specific scope that contains the range
    for (const scope of Object.keys(fileVars)) {
        const scopeRange: Range = parseScopeString(scope);
        if (isRangeWithin(normalizedRange, scopeRange)) {
            const scopeSize = (scopeRange.lineEnd - scopeRange.lineStart) * 10000 + (scopeRange.colEnd - scopeRange.colStart);
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
    const reachableVariables = getVisibleVariables(variablesInScope, file, normalizedRange);
    const visibleVariables = reachableVariables.filter(v => !v.name.includes("this#"));
    return visibleVariables;
}

function getVisibleVariables(variables: LJVariable[], file: string, range: Range, useAnnotationPositions: boolean = false): LJVariable[] {
    const isCollapsedRange = range.lineStart === range.lineEnd && range.colStart === range.colEnd;
    return variables.filter((variable) => {
        if (variable.placementInCode?.position.file !== file) return false; // variable is not in the current file
       
        const placement = variable.placementInCode?.position;
       
        // single point cursor
        if (isCollapsedRange) {
            const position = useAnnotationPositions ? variable.annPosition || placement : placement;
            if (!position || variable.isParameter) return true; // if is parameter we need to access it even if it's declared after the range (for method and parameter refinements)

            // variable was declared before the cursor line or its in the same line but before the cursor column
            return (
                position.line < range.lineStart ||
                (position.line === range.lineStart && position.column + 1 <= range.colStart)
            );
        }
        // normal range, filter variables that are only within the range
        const varRange: Range = { lineStart: placement.line, colStart: placement.column, lineEnd: placement.line, colEnd: placement.column }
        return isRangeWithin(varRange, range);
    });
}

// Normalizes the range to ensure start is before end
function normalizeRange(range: Range): Range {
    const startsBeforeEnds =
        range.lineStart < range.lineEnd ||
        (range.lineStart === range.lineEnd && range.colStart <= range.colEnd);

    if (startsBeforeEnds) return range;

    return {
        lineStart: range.lineEnd,
        colStart: range.colEnd,
        lineEnd: range.lineStart,
        colEnd: range.colStart,
    };
}

function parseScopeString(scope: string): Range {
    const [start, end] = scope.split("-");
    const [startLine, startColumn] = start.split(":").map(Number);
    const [endLine, endColumn] = end.split(":").map(Number);
    return { lineStart: startLine, colStart: startColumn, lineEnd: endLine, colEnd: endColumn };
}

function isRangeWithin(range: Range, another: Range): boolean {
    const startsWithin = range.lineStart > another.lineStart || 
        (range.lineStart === another.lineStart && range.colStart >= another.colStart);
    const endsWithin = range.lineEnd < another.lineEnd || 
        (range.lineEnd === another.lineEnd && range.colEnd <= another.colEnd);
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