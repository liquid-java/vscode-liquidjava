import type { RefinementMismatchError, TranslationTable } from "../../../types/diagnostics";
import type { VCSimplificationResult } from "../../../types/vc-implications";
import { renderHighlightedExpression } from "../../highlighting";
import { renderCodicon } from "../../icons";
import { escapeHtml } from "../../utils";
import { renderImplication, renderImplicationChange } from "./vc-changes";

// A step of Found as it is shown: a step of the verifier, or a summary in front of the newest one, which says that
// nothing known proves Expected instead of showing the chain
type VCStep = VCSimplificationResult & { nothingKnown?: boolean };

// state to preserve across re-renders
type VCState = {
    steps: VCStep[];
    translationTable: TranslationTable;
    stepIndex: number;
};

const vcStates = new Map<string, VCState>(); // errorId => VCState

// What each simplification pass of the verifier does, in the words of the step's tooltip; any other step, such as
// "Relevant to Expected", is a display step and is shown by its name
const PASS_DESCRIPTIONS: Record<string, string> = {
    "Substitution": "Replaced variables with the values they are equal to.",
    "Function Substitution": "Replaced calls with the values they are equal to.",
    "Binder": "Removed facts that say nothing, and conditions that Expected does not depend on.",
    "Known Enum Values": "Decided comparisons of variables whose enum value is known.",
    "Folding": "Computed constant expressions.",
    "Arithmetic": "Simplified arithmetic.",
    "Logical": "Simplified logical operators.",
    "Constraint": "Removed facts that other facts already imply.",
};
const DISPLAY_STEP_DESCRIPTIONS: Record<string, string> = {
    "Relevant to Expected": "Kept only the facts that Expected depends on, directly or through other facts.",
};
const ORIGINAL_DESCRIPTION = "What is known here, before simplifying.";
const NOTHING_KNOWN = "Nothing is known here that could prove Expected.";
const NOTHING_KNOWN_DESCRIPTION = "Go back to see what is known here.";
// the end of the verifier's message when nothing it found is about what Expected constrains
const NOT_PROVEN = / but could not prove it$/u;

function renderStepButton(errorId: string, step: "previous" | "next", disabled: boolean): string {
    const label = `${step === "previous" ? "Previous" : "Next"} simplification`;
    const icon = step === "previous" ? "arrow-small-left" : "arrow-small-right";
    return `<button class="vc-step-btn vc-step-${step}-btn" data-error-id="${errorId}" data-vc-step="${step}" title="${label}" aria-label="${label}" ${disabled ? "disabled" : ""} type="button">${renderCodicon(icon)}</button>`;
}

function getStepLabel(step: VCStep): { label: string; description: string } {
    if (step.nothingKnown) return { label: "Summary", description: NOTHING_KNOWN_DESCRIPTION };
    const pass = step.simplification?.trim();
    if (!pass) return { label: "Original", description: ORIGINAL_DESCRIPTION };
    if (pass in PASS_DESCRIPTIONS) return { label: "Simplified", description: PASS_DESCRIPTIONS[pass] };
    return { label: pass, description: DISPLAY_STEP_DESCRIPTIONS[pass] ?? "" };
}

function renderStepHeader(errorId: string, step: VCStep, index: number, stepCount: number): string {
    const currStep = stepCount - index;
    const { label, description } = getStepLabel(step);

    return /*html*/`
        <div class="vc-step-header">
            <span class="vc-step-title">
                <span class="vc-step-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
                ${description ? /*html*/`<span class="vc-step-info" title="${escapeHtml(description)}" aria-label="${escapeHtml(description)}">${renderCodicon("info")}</span>` : ""}
            </span>
            <div class="vc-step-navigation">
                <span class="vc-step-position" aria-label="Simplification step ${currStep} of ${stepCount}">
                    ${currStep}/${stepCount}
                </span>
                <div class="vc-step-controls">
                    ${renderStepButton(errorId, "previous", index === stepCount - 1)}
                    ${renderStepButton(errorId, "next", index === 0)}
                </div>
            </div>
        </div>
    `;
}

function getTargetStepIndex(state: VCState, step: string | null): number | undefined {
    const targetIndex = step === "previous"
        ? state.stepIndex + 1
        : step === "next"
            ? state.stepIndex - 1
            : -1;
    if (targetIndex < 0 || targetIndex >= state.steps.length) return;
    return targetIndex;
}

function renderSelectedStep(errorId: string, previousIndex?: number): string {
    const state = vcStates.get(errorId);
    if (!state) return "";

    const { steps, translationTable, stepIndex } = state;
    const current = steps[stepIndex];
    // a change is shown from a step whose chain was shown
    const previous = previousIndex === undefined || steps[previousIndex].nothingKnown ? undefined : steps[previousIndex];
    const implication = current.nothingKnown
        ? `<p class="vc-nothing-known">${NOTHING_KNOWN}</p>`
        : previous
            ? `<div class="vc-chain">${renderImplicationChange(previous.implication, current.implication, translationTable)}</div>`
            : `<div class="vc-chain">${renderImplication(current.implication, translationTable)}</div>`;

    return /*html*/`
        ${steps.length > 1 ? renderStepHeader(errorId, current, stepIndex, steps.length) : ""}
        ${implication}
    `;
}

export function handleVCImplicationStepClick(target: Element, onStepChanged?: () => void): boolean {
    const errorId = target.getAttribute("data-error-id");
    const step = target.getAttribute("data-vc-step");
    if (!errorId || (target as HTMLButtonElement).disabled) return false;

    const state = vcStates.get(errorId);
    if (!state) return false;

    const currentIndex = state.stepIndex;
    const targetIndex = getTargetStepIndex(state, step);
    const container = target.closest?.(".vc-container");
    if (targetIndex === undefined) return false;

    state.stepIndex = targetIndex;
    if (container) container.innerHTML = renderSelectedStep(errorId, currentIndex);
    onStepChanged?.();
    return true;
}

export function renderVCImplication(
    error: RefinementMismatchError,
    result: VCSimplificationResult
): string {
    if (!result?.implication) return renderHighlightedExpression(String(result));

    const errorId = encodeURIComponent(JSON.stringify([
        error.file,
        error.position?.lineStart,
        error.title,
        error.message
    ]));
    const steps: VCStep[] = [];
    // when the verifier could not prove Expected, Found opens on a summary that says so, with the steps a step back
    if (NOT_PROVEN.test(error.message)) steps.push({ ...result, nothingKnown: true });
    for (let current: VCSimplificationResult | null = result; current; current = current.origin) {
        steps.push(current);
    }
    const stepIndex = Math.min(vcStates.get(errorId)?.stepIndex ?? 0, steps.length - 1);
    vcStates.set(errorId, { steps, translationTable: error.translationTable, stepIndex });

    return /*html*/ `
        <div class="container vc-container" data-error-id="${errorId}">
            ${renderSelectedStep(errorId)}
        </div>
    `;
}
