import type { LJDiagnostic, StateRefinementError } from "../types/diagnostics";
import type { LJStateMachine } from "../types/fsm";
import { getDiagnosticRevealTarget, getDiagnosticRevealTargetKey } from "./diagnostic-reveal";

/**
 * Gets the state errors that the State Machine view can show for the current file
 * These are the state errors reported in the file and, since errors are usually reported in the caller file,
 * the ones on the state machine declared in the file, with the errors of the file first in source order
 * @param diagnostics All diagnostics in the workspace
 * @param currentFile The file open in the editor
 * @param sm The state machine declared in the current file
 */
export function getStateErrors(diagnostics: LJDiagnostic[] | undefined, currentFile: string | undefined, sm: LJStateMachine | undefined): StateRefinementError[] {
    const isCurrentFile = (error: StateRefinementError) => !!currentFile && error.file.toLowerCase() === currentFile.toLowerCase();
    return getAllStateErrors(diagnostics)
        .filter(error => isCurrentFile(error) || error.stateMachine?.className === sm?.className)
        .map((error, index) => ({ error, index }))
        .sort((a, b) => Number(isCurrentFile(b.error)) - Number(isCurrentFile(a.error))
            || a.error.file.localeCompare(b.error.file)
            || (a.error.position?.lineStart ?? 0) - (b.error.position?.lineStart ?? 0)
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
        diagnostic.type === 'state-refinement-error' && !!diagnostic.stateMachine);
}

export function getStateErrorKey(error: StateRefinementError): string {
    const target = getDiagnosticRevealTarget(error);
    // errors without a position never match the position pattern of reveal keys
    return target ? getDiagnosticRevealTargetKey(target) : `${error.file}#${error.title}#${error.message}`;
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
