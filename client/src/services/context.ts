import { extension } from "../state";
import { LJContext, Range, LJVariable } from "../types/context";
import { SourcePosition } from "../types/diagnostics";
import { getOriginalVariableName } from "../utils/utils";

export function handleContext(context: LJContext) {
    extension.context = context;
    updateContext(extension.currentSelection);
    extension.webview.sendMessage({ type: "context", context: extension.context });
}

export function updateContext(range: Range) {
    if (!range) return;
    const variablesInScope = getVariablesInScope(extension.file, range) || [];
    const globalVariables = extension.context.globalVars || [];
    const visibleVars = getVisibleVariables(variablesInScope, extension.file, range);
    const allVars = normalizeRefinements(sortVariables([...visibleVars, ...globalVariables]));
    extension.context.visibleVars = visibleVars
    extension.context.allVars = allVars;
}

// Gets the variables in scope for a given file and position
// Returns null if position not in any scope
export function getVariablesInScope(file: string, range: Range): LJVariable[] | null {
    // get variables in file
    const fileVars = extension.context.vars[file];
    if (!fileVars) return null;

    // get variables in the current scope based on the range
    let mostSpecificScope: string | null = null;
    let minScopeSize = Infinity;

    // find the most specific scope that contains the range
    for (const scope of Object.keys(fileVars)) {
        const scopeRange: Range = parseScopeString(scope);
        if (isRangeWithin(range, scopeRange)) {
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
    const scopeVars = fileVars[mostSpecificScope];
    const instanceScopeVars = filterRelevantInstanceVariables(extension.context.instanceVars || [], scopeVars)
    const variablesInScope = [...scopeVars, ...instanceScopeVars];
    return getVisibleVariables(variablesInScope, file, range);
}

function getVisibleVariables(variables: LJVariable[], file: string, range: Range, useAnnotationPositions: boolean = false): LJVariable[] {
    const isCollapsedRange = range.lineStart === range.lineEnd && range.colStart === range.colEnd;
    return variables.filter((variable) => {
        if (variable.position?.file !== file) return false; // variable is not in the current file
       
        // single point cursor
        if (isCollapsedRange) {
            const position: SourcePosition = useAnnotationPositions ? variable.annPosition || variable.position : variable.position;
            if (!position || variable.isParameter) return true; // if is parameter we need to access it even if it's declared after the range (for method and parameter refinements)

            // variable was declared before the cursor line or its in the same line but before the cursor column
            return (
                position.lineStart < range.lineStart ||
                (position.lineStart === range.lineStart && position.colStart + 1 <= range.colStart)
            );
        }
        // normal range, filter variables that are only within the range
        return isRangeWithin(variable.position, range);
    });
}

// Normalizes the range to ensure start is before end
export function normalizeRange(range: Range): Range {
    const isStartBeforeEnd =
        range.lineStart < range.lineEnd ||
        (range.lineStart === range.lineEnd && range.colStart <= range.colEnd);

    if (isStartBeforeEnd) return range;
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

export function filterDuplicateVariables(variables: LJVariable[]): LJVariable[] {
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
        const leftPosition = left.position
        const rightPosition = right.position

        if (!leftPosition && !rightPosition) return compareVariableNames(left, right);
        if (!leftPosition) return 1;
        if (!rightPosition) return -1;
        if (getOriginalVariableName(left.name) === "ret") return 1;
        if (getOriginalVariableName(right.name) === "ret") return -1;
        if (leftPosition.lineStart !== rightPosition.lineStart) return leftPosition.lineStart - rightPosition.lineStart;
        if (leftPosition.colStart !== rightPosition.colStart) return leftPosition.colStart - rightPosition.colStart;

        return compareVariableNames(left, right);
    });
}

function compareVariableNames(a: LJVariable, b: LJVariable): number {
    return getOriginalVariableName(a.name).localeCompare(getOriginalVariableName(b.name));
}

function filterRelevantInstanceVariables(instanceVars: LJVariable[], variablesInScope: LJVariable[]): LJVariable[] {
    return instanceVars.filter(v => variablesInScope.some(s => s.name === getOriginalVariableName(v.name)));
}

export function filterInstanceVariables(variables: LJVariable[]): LJVariable[] {
    return variables.filter(v => !v.name.includes("#"));
}

function normalizeRefinements(variables: LJVariable[]): LJVariable[] {
    return Array.from(new Map(variables.map(v => [v.refinement, v])).values()) // filter variables with duplicate refinements
        .filter(v => !v.refinement.includes("==") || v.refinement.split("==").map(s => s.trim()).some((s, _, a) => s !== a[0])) // filter refinements that are just "var == var"
        .map(v => ({ ...v, refinement: v.refinement.includes("==") ? v.refinement : `${v.name} == ${v.refinement}` })); // ensure refinements are in the form "var == refinement"
}