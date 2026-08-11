import type { RefinementMismatchError, TranslationTable } from "../../../types/diagnostics";
import type { VCSimplificationResult } from "../../../types/vc-implications";
import { renderHighlightedExpression } from "../../highlighting";
import { renderCodicon } from "../../icons";
import { escapeHtml } from "../../utils";
import { renderImplication, renderImplicationChange } from "./vc-changes";

// state to preserve across re-renders
type VCState = {
    steps: VCSimplificationResult[];
    translationTable: TranslationTable;
    stepIndex: number;
};

const vcStates = new Map<string, VCState>(); // errorId => VCState

function renderStepButton(errorId: string, step: "previous" | "next", disabled: boolean): string {
    const label = `${step === "previous" ? "Previous" : "Next"} simplification`;
    const icon = step === "previous" ? "arrow-small-left" : "arrow-small-right";
    return `<button class="vc-step-btn vc-step-${step}-btn" data-error-id="${errorId}" data-vc-step="${step}" title="${label}" aria-label="${label}" ${disabled ? "disabled" : ""} type="button">${renderCodicon(icon)}</button>`;
}

function renderStepHeader(
    errorId: string,
    current: VCSimplificationResult,
    index: number,
    stepCount: number,
): string {
    const currStep = stepCount - index;
    const simplification = current.simplification?.trim();
    const label = escapeHtml(index === 0 ? "Simplified" : simplification || "Original");

    return /*html*/`
        <div class="vc-step-header">
            <span class="vc-step-name" title="${label}">${label}</span>
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

    const errorId = encodeURIComponent(JSON.stringify([
        error.file,
        error.position?.lineStart,
        error.title,
        error.message
    ]));
    const steps: VCSimplificationResult[] = [];
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
