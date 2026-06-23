import type { RefinementMismatchError } from "../../../types/diagnostics";
import type { VCSimplificationResult } from "../../../types/vc-implications";
import { renderHighlightedExpression } from "../../highlighting";
import { renderCodicon } from "../../icons";
import { escapeHtml } from "../../utils";
import { renderImplication, renderImplicationChange } from "./vc-changes";

const stepIndexes = new Map<string, number>(); // errorId => step index, preserved across re-renders
const simplificationSteps = new Map<string, VCSimplificationResult[]>();

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
    const chronologicalStep = stepCount - index;
    const simplification = current.simplification?.trim();
    const label = simplification || "Original";

    return /*html*/`
        <div class="vc-step-header">
            <span class="vc-step-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <div class="vc-step-navigation">
                <span class="vc-step-position" aria-label="Simplification step ${chronologicalStep} of ${stepCount}">
                    ${chronologicalStep}/${stepCount}
                </span>
                <div class="vc-step-controls">
                    ${renderStepButton(errorId, "previous", index === stepCount - 1)}
                    ${renderStepButton(errorId, "next", index === 0)}
                </div>
            </div>
        </div>
    `;
}

function getTargetStepIndex(errorId: string, step: string | null): number | undefined {
    const steps = simplificationSteps.get(errorId);
    if (!steps) return undefined;

    const index = stepIndexes.get(errorId) ?? 0;
    const targetIndex = step === "previous" ? index + 1 : step === "next" ? index - 1 : -1;
    if (targetIndex < 0 || targetIndex >= steps.length) return undefined;
    return targetIndex;
}

function renderSelectedStep(errorId: string, previousIndex?: number): string {
    const steps = simplificationSteps.get(errorId);
    if (!steps) return "";

    const index = Math.min(stepIndexes.get(errorId) ?? 0, steps.length - 1);
    const current = steps[index];
    const previous = previousIndex === undefined ? undefined : steps[previousIndex];
    const implication = previous
        ? `<div class="vc-chain">${renderImplicationChange(previous.implication, current.implication)}</div>`
        : `<div class="vc-chain">${renderImplication(current.implication)}</div>`;

    return /*html*/`
        ${steps.length > 1 ? renderStepHeader(errorId, current, index, steps.length) : ""}
        ${implication}
    `;
}

export function handleVCImplicationStepClick(target: Element): boolean {
    const errorId = target.getAttribute("data-error-id");
    const step = target.getAttribute("data-vc-step");
    if (!errorId || (target as HTMLButtonElement).disabled) return false;

    const currentIndex = stepIndexes.get(errorId) ?? 0;
    const targetIndex = getTargetStepIndex(errorId, step);
    const container = target.closest?.(".vc-container");
    if (targetIndex === undefined) return false;

    stepIndexes.set(errorId, targetIndex);
    if (container) container.innerHTML = renderSelectedStep(errorId, currentIndex);
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
    simplificationSteps.set(errorId, steps);

    const index = Math.min(stepIndexes.get(errorId) ?? 0, steps.length - 1);
    stepIndexes.set(errorId, index);

    return /*html*/ `
        <div class="container vc-container" data-error-id="${errorId}">
            ${renderSelectedStep(errorId)}
        </div>
    `;
}
