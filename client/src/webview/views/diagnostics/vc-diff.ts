import type { VCImplication } from "../../../types/vc-implications";
import { renderHighlightedInlineExpression } from "../../highlighting";

type DiffKind = "unchanged" | "removed" | "added";

type DiffOperation<T> = {
    kind: DiffKind;
    value: T;
};

function getImplicationLines(node: VCImplication): string[] {
    const lines: string[] = [];
    for (let current: VCImplication | null = node; current; current = current.next) {
        const binder = current.name !== null && current.type !== null;
        if (!binder && current.next || current.predicate === "true" && current.next !== null) continue;
        lines.push(current.predicate);
    }
    return lines;
}

function renderVCLine(content: string, className = ""): string {
    return /*html*/`
        <div class="vc-line ${className}">
            <div class="vc-line-content"><span class="vc-node">${content}</span></div>
        </div>
    `;
}

function diffSequence<T>(before: T[], after: T[]): DiffOperation<T>[] {
    const lengths = Array.from(
        { length: before.length + 1 },
        () => new Array<number>(after.length + 1).fill(0),
    );

    for (let beforeIndex = before.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
        for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
            lengths[beforeIndex][afterIndex] = before[beforeIndex] === after[afterIndex]
                ? lengths[beforeIndex + 1][afterIndex + 1] + 1
                : Math.max(lengths[beforeIndex + 1][afterIndex], lengths[beforeIndex][afterIndex + 1]);
        }
    }

    const operations: DiffOperation<T>[] = [];
    let beforeIndex = 0;
    let afterIndex = 0;

    while (beforeIndex < before.length && afterIndex < after.length) {
        if (before[beforeIndex] === after[afterIndex]) {
            operations.push({ kind: "unchanged", value: before[beforeIndex] });
            beforeIndex += 1;
            afterIndex += 1;
        } else if (lengths[beforeIndex + 1][afterIndex] >= lengths[beforeIndex][afterIndex + 1]) {
            operations.push({ kind: "removed", value: before[beforeIndex] });
            beforeIndex += 1;
        } else {
            operations.push({ kind: "added", value: after[afterIndex] });
            afterIndex += 1;
        }
    }

    while (beforeIndex < before.length) {
        operations.push({ kind: "removed", value: before[beforeIndex] });
        beforeIndex += 1;
    }
    while (afterIndex < after.length) {
        operations.push({ kind: "added", value: after[afterIndex] });
        afterIndex += 1;
    }

    return operations;
}

function tokenizeExpression(expression: string): string[] {
    return expression.match(
        /\s+|-->|&&|\|\||==|!=|<=|>=|[a-zA-Z_#][a-zA-Z0-9_#⁰¹²³⁴⁵⁶⁷⁸⁹]*|\d+(?:\.\d+)?|[^\s]/gu,
    ) || [];
}

function renderTokenDiff(before: string, after: string): { removed: string; added: string } {
    const operations = diffSequence(tokenizeExpression(before), tokenizeExpression(after));
    return {
        removed: renderDiffSide(operations, "removed"),
        added: renderDiffSide(operations, "added"),
    };
}

function renderDiffSide(operations: DiffOperation<string>[], changedKind: "removed" | "added"): string {
    let html = "";
    let changedContent = "";

    const flushChangedContent = () => {
        if (!changedContent) return;
        html += `<span class="vc-diff-fragment vc-diff-fragment-${changedKind}">${renderHighlightedInlineExpression(changedContent)}</span>`;
        changedContent = "";
    };

    for (const operation of operations) {
        if (operation.kind === changedKind) {
            changedContent += operation.value;
            continue;
        }
        if (operation.kind === "unchanged") {
            flushChangedContent();
            html += renderHighlightedInlineExpression(operation.value);
        }
    }
    flushChangedContent();
    return html;
}

function renderChangedLines(removed: string[], added: string[]): string {
    const removedLines: string[] = [];
    const addedLines: string[] = [];
    const pairedCount = Math.min(removed.length, added.length);

    for (let index = 0; index < pairedCount; index += 1) {
        const diff = renderTokenDiff(removed[index], added[index]);
        removedLines.push(renderVCLine(diff.removed, "vc-diff-line vc-diff-line-removed"));
        addedLines.push(renderVCLine(diff.added, "vc-diff-line vc-diff-line-added"));
    }
    for (let index = pairedCount; index < removed.length; index += 1) {
        const content = `<span class="vc-diff-fragment vc-diff-fragment-removed">${renderHighlightedInlineExpression(removed[index])}</span>`;
        removedLines.push(renderVCLine(content, "vc-diff-line vc-diff-line-removed"));
    }
    for (let index = pairedCount; index < added.length; index += 1) {
        const content = `<span class="vc-diff-fragment vc-diff-fragment-added">${renderHighlightedInlineExpression(added[index])}</span>`;
        addedLines.push(renderVCLine(content, "vc-diff-line vc-diff-line-added"));
    }

    return [...removedLines, ...addedLines].join("");
}

export function renderImplication(node: VCImplication): string {
    return getImplicationLines(node)
        .map(predicate => renderVCLine(renderHighlightedInlineExpression(predicate)))
        .join("");
}

export function renderImplicationDiff(before: VCImplication, after: VCImplication): string {
    const operations = diffSequence(getImplicationLines(before), getImplicationLines(after));
    const lines: string[] = [];
    let index = 0;

    while (index < operations.length) {
        const operation = operations[index];
        if (operation.kind === "unchanged") {
            lines.push(renderVCLine(renderHighlightedInlineExpression(operation.value)));
            index += 1;
            continue;
        }

        const removed: string[] = [];
        const added: string[] = [];
        while (index < operations.length && operations[index].kind !== "unchanged") {
            const changedOperation = operations[index];
            if (changedOperation.kind === "removed") removed.push(changedOperation.value);
            if (changedOperation.kind === "added") added.push(changedOperation.value);
            index += 1;
        }
        lines.push(renderChangedLines(removed, added));
    }

    return lines.join("");
}
