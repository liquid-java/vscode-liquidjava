import type { RefinementMismatchError, TranslationTable } from "../../../types/diagnostics";
import type { VCImplication, VCSimplificationResult } from "../../../types/vc-implications";
import { renderHighlightedExpression } from "../../highlighting";
import { renderCodicon } from "../../icons";
import { escapeHtml } from "../../utils";
import { getImplicationLines, renderImplication, renderImplicationChange } from "./vc-changes";

// A step of Found as it is shown: its chain, and the passes that changed it since the step before
type VCStep = {
    implication: VCImplication;
    passes: string[];
};

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
    "Relevant to Expected": "Kept only the facts that share a term with Expected.",
};
const ORIGINAL_DESCRIPTION = "What is known here, before simplifying.";
// names the verifier makes up (#if_condition) or numbers (x#1), which do not appear in the code
const GENERATED_NAME = /#\w/u;

function renderStepButton(errorId: string, step: "previous" | "next", disabled: boolean): string {
    const label = `${step === "previous" ? "Previous" : "Next"} simplification`;
    const icon = step === "previous" ? "arrow-small-left" : "arrow-small-right";
    return `<button class="vc-step-btn vc-step-${step}-btn" data-error-id="${errorId}" data-vc-step="${step}" title="${label}" aria-label="${label}" ${disabled ? "disabled" : ""} type="button">${renderCodicon(icon)}</button>`;
}

function getStepLabel(step: VCStep): { label: string; description: string } {
    if (step.passes.length === 0) return { label: "Original", description: ORIGINAL_DESCRIPTION };
    const displayStep = step.passes.find(pass => !(pass in PASS_DESCRIPTIONS));
    const description = step.passes
        .map(pass => PASS_DESCRIPTIONS[pass] ?? DISPLAY_STEP_DESCRIPTIONS[pass])
        .filter(Boolean)
        .join(" ");
    return { label: displayStep ?? "Simplified", description };
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

/**
 * The steps of a derivation worth showing, newest first. The newest is always shown; an older one only when its lines
 * use no generated name, and not when it looks like the step after it or only continues the same pass. Each step keeps
 * the passes that changed the lines since the step before it
 */
function getVCSteps(result: VCSimplificationResult): VCStep[] {
    const derivation: VCSimplificationResult[] = [];
    for (let current: VCSimplificationResult | null = result; current; current = current.origin) {
        derivation.unshift(current);
    }
    const lines = derivation.map(current => getImplicationLines(current.implication));

    const shown: number[] = [];
    lines.forEach((stepLines, index) => {
        const isNewest = index === derivation.length - 1;
        if (!isNewest && stepLines.some(line => GENERATED_NAME.test(line))) return;
        const last: number | undefined = shown[shown.length - 1];
        if (last !== undefined && (sameLines(lines[last], stepLines)
            || (last > 0 && derivation[last].simplification === derivation[index].simplification))) {
            shown.pop();
        }
        shown.push(index);
    });

    let previous = 0;
    return shown.map(index => {
        const passes = new Set<string>();
        for (let i = previous + 1; i <= index; i++) {
            const pass = derivation[i].simplification;
            if (pass && !sameLines(lines[i - 1], lines[i])) passes.add(pass);
        }
        previous = index;
        return { implication: derivation[index].implication, passes: [...passes] };
    }).reverse();
}

function sameLines(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((line, i) => line === b[i]);
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
    const previous = previousIndex === undefined ? undefined : steps[previousIndex];
    const implication = previous
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
    const steps = getVCSteps(result);

    const errorId = encodeURIComponent(JSON.stringify([
        error.file,
        error.position?.lineStart,
        error.title,
        error.message
    ]));
    const stepIndex = Math.min(vcStates.get(errorId)?.stepIndex ?? 0, steps.length - 1);
    vcStates.set(errorId, { steps, translationTable: error.translationTable, stepIndex });

    return /*html*/ `
        <div class="container vc-container" data-error-id="${errorId}">
            ${renderSelectedStep(errorId)}
        </div>
    `;
}
