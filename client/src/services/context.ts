import { extension } from "../state";
import { LJContext, Range, LJVariable } from "../types/context";
import { SourcePosition } from "../types/diagnostics";
import { getOriginalVariableName } from "../utils/utils";

export function handleContext(context: LJContext) {
    extension.context = context;
    updateContextForSelection(extension.currentSelection);
    extension.webview.sendMessage({ type: "context", context: extension.context, errorAtCursor: extension.errorAtCursor });
}

export function updateContextForSelection(selection: Range) {
    if (!selection) return;

    const globalVars = extension.context.globalVars || [];
    const localVars = extension.context.localVars || []; 
    const variablesInScope = getVariablesInScope(localVars, extension.file, selection);
    const visibleVars = getVisibleVariables(variablesInScope, extension.file, selection);
    const allVars = sortVariables(normalizeVariableRefinements([...globalVars, ...visibleVars]));
    extension.context.visibleVars = visibleVars;
    extension.context.allVars = allVars;
}

function getVariablesInScope(variables: LJVariable[], file: string, selection: Range): LJVariable[] {
    const scopes = extension.context.fileScopes[file] || [];
    const enclosingScopes = scopes.filter(scope => isRangeWithin(selection, scope));
    return variables.filter(v =>
        v.position?.file === file &&
        enclosingScopes.some(scope => isRangeWithin(v.position, scope))
    );
}

function getVisibleVariables(variables: LJVariable[], file: string, selection: Range): LJVariable[] {
    const isCollapsedRange = selection.lineStart === selection.lineEnd && selection.colStart === selection.colEnd;
    const fileScopes = isCollapsedRange ? (extension.context.fileScopes[file] || []) : [];
    return variables.filter((variable) => {
        // variable must be declared in the same file
        if (!variable.position || variable.position?.file !== file) return false;
       
        // single point cursor
        if (isCollapsedRange) {
            const position: SourcePosition = variable.annotationPosition || variable.position!;
            if (!position) return false;

            // variable was declared before the cursor line or its in the same line but before the cursor column
            const beforeCursor = isPositionBefore(position, selection);
            if (!beforeCursor) return false;

            // exclude variables that in unreachable scopes
            const isInUnreachableScope = fileScopes.some(scope =>
                isRangeWithin(variable.position!, scope) && !isRangeWithin(selection, scope)
            );
            return !isInUnreachableScope;
        }
        // normal range, filter variables that intersect the selection
        return rangesIntersect(variable.position, selection);
    });
}

// Normalizes the range to ensure start is before end
export function normalizeRange(range: Range): Range {
    const reversedRange: Range = reverseRange(range);
    if (isPositionBefore(range, reversedRange)) return range;
    return reversedRange;   
}

export function rangesIntersect(a: Range, b: Range): boolean {
    const aEnd = reverseRange(a);
    const bEnd = reverseRange(b);
    return isPositionBeforeOrEqual(a, bEnd) && isPositionBeforeOrEqual(b, aEnd);
}

export function isRangeWithin(range: Range, another: Range): boolean {
    const startsWithin = isPositionBeforeOrEqual(another, range);
    const rangeEnd = reverseRange(range);
    const anotherEnd = reverseRange(another);
    const endsWithin = isPositionBeforeOrEqual(rangeEnd, anotherEnd);
    return startsWithin && endsWithin;
}

export function isPositionBefore(range: Range, another: Range): boolean {
    return range.lineStart < another.lineStart || (range.lineStart === another.lineStart && range.colStart < another.colStart);
}

export function isPositionBeforeOrEqual(range: Range, another: Range): boolean {
    return range.lineStart < another.lineStart || (range.lineStart === another.lineStart && range.colStart <= another.colStart);
}

export function reverseRange(range: Range): Range {
    return {
        lineStart: range.lineEnd,
        colStart: range.colEnd,
        lineEnd: range.lineStart,
        colEnd: range.colStart
    }
}

export function filterInstanceVariables(variables: LJVariable[]): LJVariable[] {
    return variables.filter(v => !v.name.includes("#"));
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

// Sorts variables by their position or name
function sortVariables(variables: LJVariable[]): LJVariable[] {
    return variables.sort((left, right) => {
        if (!left.position && !right.position) return compareVariableNames(left, right);
        if (!left.position) return 1;
        if (!right.position) return -1;
        if (left.position.lineStart !== right.position.lineStart) return left.position.lineStart - right.position.lineStart;
        if (left.position.colStart !== right.position.colStart) return right.position.colStart - left.position.colStart;
        return compareVariableNames(left, right);
    });
}

function compareVariableNames(a: LJVariable, b: LJVariable): number {
    if (a.name.startsWith("#") && b.name.startsWith("#")) return getOriginalVariableName(a.name).localeCompare(getOriginalVariableName(b.name));
    if (a.name.startsWith("#")) return 1;
    if (b.name.startsWith("#")) return -1;
    return a.name.localeCompare(b.name);
}

function normalizeVariableRefinements(variables: LJVariable[]): LJVariable[] {
    return Array.from(new Map(variables.map(v => [v.refinement, v])).values()).flatMap(v => {
        if (!v.refinement || v.refinement === "true") return []; // filter out trivial refinements
        if (v.refinement.includes("==")) {
            const [left, right] = v.refinement.split("==").map(s => s.trim());
            return left !== right ? [v] : []; // filter tautologies like x == x
        }
        if (v.refinement.includes("!=") || v.refinement.includes(">") || v.refinement.includes("<")) return [v];
        return [{ ...v, refinement: `${v.name} == ${v.refinement}` }];
    });
}