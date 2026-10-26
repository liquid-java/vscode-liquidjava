import type { LJDiagnostic, StateRefinementError } from "../types/diagnostics";
import { getDiagnosticKey, getDiagnosticRevealTargetKey } from "./diagnostic-reveal";

/**
 * Gets the state errors reported in the current file, in source order
 * These are the errors the State Machine view steps through, one for each Show in state machine button of the file
 * @param diagnostics All diagnostics in the workspace
 * @param currentFile The file open in the editor
 */
export function getStateErrors(diagnostics: LJDiagnostic[] | undefined, currentFile: string | undefined): StateRefinementError[] {
    if (!currentFile) return [];
    return getAllStateErrors(diagnostics)
        .filter(error => error.file.toLowerCase() === currentFile.toLowerCase())
        .map((error, index) => ({ error, index }))
        .sort((a, b) => (a.error.position?.lineStart ?? 0) - (b.error.position?.lineStart ?? 0)
            || (a.error.position?.colStart ?? 0) - (b.error.position?.colStart ?? 0)
            || a.index - b.index)
        .map(({ error }) => error);
}

/**
 * Gets the state errors in the workspace that carry the state machine of their receiver
 * @param diagnostics All diagnostics in the workspace
 */
export function getAllStateErrors(diagnostics: LJDiagnostic[] | undefined): StateRefinementError[] {
    return (diagnostics ?? []).filter((diagnostic): diagnostic is StateRefinementError =>
        diagnostic.type === 'state-refinement-error' && diagnostic.stateMachines.length > 0);
}

export function getStateErrorKey(error: StateRefinementError): string {
    return getDiagnosticKey(error);
}

/**
 * Finds the selected error again after a new verification
 * Since edits can move the error position, falls back to the same file and called method when that call was
 * the only one before and after the verification, so a fixed error never passes its selection to a sibling
 * @param errors The state errors after the verification
 * @param selected The previously selected error
 * @param previousErrors The state errors before the verification
 */
export function findStateError(errors: StateRefinementError[], selected: StateRefinementError | undefined,
    previousErrors: StateRefinementError[] = []): StateRefinementError | undefined {
    if (!selected) return undefined;
    const key = getStateErrorKey(selected);
    const exact = errors.find(error => getStateErrorKey(error) === key);
    const declarationKey = getDeclarationKey(selected);
    if (exact || !declarationKey) return exact;

    const isSameCall = (error: StateRefinementError) =>
        error.file.toLowerCase() === selected.file.toLowerCase() && getDeclarationKey(error) === declarationKey;
    const candidates = errors.filter(isSameCall);
    const previousCandidates = previousErrors.filter(isSameCall);
    return candidates.length === 1 && previousCandidates.length === 1 ? candidates[0] : undefined;
}

function getDeclarationKey(error: StateRefinementError): string | undefined {
    const position = error.declarationPosition;
    if (!position?.file) return undefined;
    return getDiagnosticRevealTargetKey({ file: position.file, position });
}
