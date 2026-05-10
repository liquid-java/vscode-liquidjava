import { extension } from "../state";
import { LJContext, Range, LJVariable } from "../types/context";
import { SourcePosition } from "../types/diagnostics";
import { getOriginalVariableName } from "../utils/utils";

export function handleContext(context: LJContext) {
    extension.context = context;
    extension.logger?.client.info(JSON.stringify(context.methods, null, 2))
    if (!extension.file || !extension.currentSelection) return;

    // update variables based on new context in current selection
    const { allVars, visibleVars } = getSelectionContextVariables(extension.file, extension.currentSelection);
    extension.context.visibleVars = visibleVars;
    extension.context.allVars = allVars;
    extension.webview.sendMessage({ type: "context", context: extension.context, errorAtCursor: extension.errorAtCursor });
}

export function getSelectionContextVariables(file: string, selection: Range): { visibleVars: LJVariable[]; allVars: LJVariable[] } {
    const globalVars = extension.context?.globalVars || [];
    const localVars = extension.context?.localVars || [];
    const variablesInScope = getVariablesInScope(localVars, file, selection);
    const visibleVarsByPosition = getVisibleVariables(variablesInScope, file, selection, false);
    const visibleVarsByAnnotationPosition = getVisibleVariables(variablesInScope, file, selection, true);
    const allVars = sortVariables(normalizeVariableRefinements([...globalVars, ...visibleVarsByPosition]));
    return { visibleVars: visibleVarsByAnnotationPosition, allVars };
}

function getVariablesInScope(variables: LJVariable[], file: string, selection: Range): LJVariable[] {
    const scopes = extension.context.fileScopes[file] || [];
    const enclosingScopes = scopes.filter(scope => isRangeWithin(selection, scope));
    return variables.filter(v =>
        v.position?.file === file &&
        enclosingScopes.some(scope => isRangeWithin(v.position, scope))
    );
}

function getVisibleVariables(variables: LJVariable[], file: string, selection: Range, useAnnotationPosition: boolean): LJVariable[] {
    const isCollapsedRange = selection.lineStart === selection.lineEnd && selection.colStart === selection.colEnd;
    const fileScopes = isCollapsedRange ? (extension.context.fileScopes[file] || []) : [];
    return variables.filter((variable) => {
        // variable must be declared in the same file
        if (!variable.position || variable.position?.file !== file) return false;
       
        // single point cursor
        if (isCollapsedRange) {
            const position: SourcePosition = (useAnnotationPosition && variable.annotationPosition) || variable.position;

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
    if (isBefore(range.lineStart, range.colStart, range.lineEnd, range.colEnd)) return range;
    return { lineStart: range.lineEnd, colStart: range.colEnd, lineEnd: range.lineStart, colEnd: range.colStart };
}

export function rangesIntersect(a: Range, b: Range): boolean {
    return isBeforeOrEqual(a.lineStart, a.colStart, b.lineEnd, b.colEnd) &&
           isBeforeOrEqual(b.lineStart, b.colStart, a.lineEnd, a.colEnd);
}

export function isRangeWithin(range: Range, another: Range): boolean {
    return isBeforeOrEqual(another.lineStart, another.colStart, range.lineStart, range.colStart) &&
           isBeforeOrEqual(range.lineEnd, range.colEnd, another.lineEnd, another.colEnd);
}

export function isPositionBefore(range: Range, another: Range): boolean {
    return isBefore(range.lineStart, range.colStart, another.lineStart, another.colStart);
}

function isBefore(line1: number, col1: number, line2: number, col2: number): boolean {
    return line1 < line2 || (line1 === line2 && col1 < col2);
}

function isBeforeOrEqual(line1: number, col1: number, line2: number, col2: number): boolean {
    return line1 < line2 || (line1 === line2 && col1 <= col2);
}

export function filterInstanceVariables(variables: LJVariable[]): LJVariable[] {
    return variables.filter(v => !v.internalName.includes("#"));
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
        if (!left.position && !right.position) return compareVariableNames(left.internalName, right.internalName);
        if (!left.position) return 1;
        if (!right.position) return -1;
        if (left.position.lineStart !== right.position.lineStart) return left.position.lineStart - right.position.lineStart;
        if (left.position.colStart !== right.position.colStart) return right.position.colStart - left.position.colStart;
        return compareVariableNames(left.internalName, right.internalName);
    });
}

function compareVariableNames(a: string, b: string): number {
    if (a.startsWith("#") && b.startsWith("#")) return getOriginalVariableName(a).localeCompare(getOriginalVariableName(b));
    if (a.startsWith("#")) return 1;
    if (b.startsWith("#")) return -1;
    return a.localeCompare(b);
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