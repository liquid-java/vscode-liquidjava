import type { RefinementMismatchError } from "../../../types/diagnostics";
import type { VCImplication, VCSimplificationResult } from "../../../types/vc-implications";
import { renderHighlightedExpression, renderHighlightedInlineExpression } from "../../highlighting";
import { renderCodicon } from "../../icons";
import { escapeHtml } from "../../utils";

const stepIndexes = new Map<string, number>(); // step index => errorId to preserve step state across re-renders

function renderImplication(node: VCImplication): string {
    const lines: string[] = [];

    for (let current: VCImplication | null = node; current; current = current.next) {
        const binder = current.name !== null && current.type !== null;
        if (!binder && current.next || current.predicate === "true" && current.next !== null) continue;

        const content = /*binder
            ? `<span class="vc-binder">∀${escapeHtml(current.name!)}: ${escapeHtml(current.type!)}.</span> ${renderHighlightedInlineExpression(current.predicate)}`
            :*/ renderHighlightedInlineExpression(current.predicate);
        lines.push(`<div class="vc-line"><div class="vc-line-content"><span class="vc-node">${content}</span></div></div>`);
    }

    return lines.join("");
}

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

export function handleVCImplicationStepClick(target: Element): boolean {
    const errorId = target.getAttribute("data-error-id");
    const step = target.getAttribute("data-vc-step");
    if (!errorId || target.hasAttribute("disabled")) return false;

    const index = stepIndexes.get(errorId) ?? 0;
    const nextIndex = step === "previous" ? index + 1 : step === "next" ? index - 1 : -1;
    if (nextIndex < 0) return false;

    stepIndexes.set(errorId, nextIndex);
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

    const index = Math.min(stepIndexes.get(errorId) ?? 0, steps.length - 1);
    stepIndexes.set(errorId, index);
    const current = steps[index];

    return /*html*/ `
        <div class="container vc-container" data-error-id="${errorId}">
            ${steps.length > 1 ? renderStepHeader(errorId, current, index, steps.length) : ""}
            <div class="vc-chain">${renderImplication(current.implication)}</div>
        </div>
    `;
}
