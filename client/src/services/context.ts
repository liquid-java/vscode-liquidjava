import { extension } from "../state";
import { LJContext, Range, LJVariable } from "../types/context";
import { SourcePosition } from "../types/diagnostics";
import { getOriginalVariableName } from "../utils/utils";

export function handleContext(context: LJContext) {
    extension.context = context;
    updateContextForSelection(extension.currentSelection);
    extension.webview.sendMessage({ type: "context", context: extension.context });
}

export function updateContextForSelection(selection: Range) {
    if (!selection) return;

    const globalVars = extension.context.globalVars || [];
    const localVars = extension.context.localVars || [];
    const scope = getMostSpecificScope(extension.file, selection);

    let visibleVars: LJVariable[] = [];
    if (scope) {
        const variablesInScope = getVariablesInScope(localVars, extension.file, scope);
        visibleVars = getVisibleVariables(variablesInScope, extension.file, selection);
    }

    const allVars = sortVariables(normalizeRefinements([...globalVars, ...visibleVars]));
    extension.context.visibleVars = visibleVars;
    extension.context.allVars = allVars;
}

function getMostSpecificScope(file: string, range: Range): Range | null {
    // get scopes for the current file
    const scopes = extension.context.fileScopes[file];
    if (!scopes) return null;
    
    // find the most specific scope that contains the range
    let mostSpecificScope: Range | null = null;
    let minScopeSize = Infinity;
    for (const scope of scopes) {
        if (isRangeWithin(range, scope)) {
            const scopeSize = (scope.lineEnd - scope.lineStart) * 10000 + (scope.colEnd - scope.colStart);
            if (scopeSize < minScopeSize) {
                mostSpecificScope = scope;
                minScopeSize = scopeSize;
            }
        }
    }
    return mostSpecificScope;
}

function getVariablesInScope(variables: LJVariable[], file: string, scope: Range): LJVariable[] {
    return variables.filter(v => v.position?.file === file && isRangeWithin(v.position, scope));
}

function getVisibleVariables(variables: LJVariable[], file: string, selection: Range, useAnnotationPositions: boolean = false): LJVariable[] {
    const isCollapsedRange = selection.lineStart === selection.lineEnd && selection.colStart === selection.colEnd;
    return variables.filter((variable) => {
        if (!variable.position) return false; // variable has no position
        if (variable.position?.file !== file) return false; // variable is not in the current file
       
        // single point cursor
        if (isCollapsedRange) {
            const position: SourcePosition = useAnnotationPositions ? variable.annPosition || variable.position : variable.position;
            if (!position || variable.isParameter) return true; // if is parameter we need to access it even if it's declared after the range (for method and parameter refinements)

            // variable was declared before the cursor line or its in the same line but before the cursor column
            return (
                position.lineStart < selection.lineStart ||
                (position.lineStart === selection.lineStart && position.colStart + 1 <= selection.colStart)
            );
        }
        // normal range, filter variables that are only within the range
        return isRangeWithin(variable.position, selection);
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

export function filterInstanceVariables(variables: LJVariable[]): LJVariable[] {
    return variables.filter(v => !v.name.includes("#"));
}

function normalizeRefinements(variables: LJVariable[]): LJVariable[] {
    return Array.from(new Map(variables.map(v => [v.refinement, v])).values())
        .filter(v => v.refinement !== "true")
        .flatMap(v => {
            if (v.refinement.includes("==")) {
                const [left, right] = v.refinement.split("==").map(s => s.trim());
                return left === right ? [] : [{ ...v, refinement: right }];
            }
            return v;
        });
}