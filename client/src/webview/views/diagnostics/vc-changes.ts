import type { VCImplication } from "../../../types/vc-implications";
import { renderHighlightedInlineExpression } from "../../highlighting";

type ChangeKind = "unchanged" | "removed" | "added";

type DiffOperation<T> = {
    kind: ChangeKind;
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

function renderChangedFragment(content: string): string {
    return `<span class="vc-change-fragment">${renderHighlightedInlineExpression(content)}</span>`;
}

function renderDestinationTokenDiff(before: string, after: string): { content: string; hasAddedContent: boolean } {
    const operations = diffSequence(tokenizeExpression(before), tokenizeExpression(after));
    let html = "";
    let changedContent = "";
    let hasAddedContent = false;

    const flushChangedContent = () => {
        if (!changedContent) return;
        const trailingWhitespace = changedContent.match(/\s+$/u)?.[0] ?? "";
        const content = changedContent.slice(0, changedContent.length - trailingWhitespace.length);
        if (content) html += renderChangedFragment(content);
        html += trailingWhitespace;
        changedContent = "";
    };

    operations.forEach((operation, index) => {
        if (operation.kind === "added") {
            changedContent += operation.value;
            hasAddedContent = true;
            return;
        }
        if (operation.kind === "unchanged") {
            if (/^\s+$/u.test(operation.value) && changedContent && operations[index + 1]?.kind === "added") {
                changedContent += operation.value;
                return;
            }
            flushChangedContent();
            html += renderHighlightedInlineExpression(operation.value);
        }
    });
    flushChangedContent();
    return { content: html, hasAddedContent };
}

function getLineSimilarity(before: string, after: string): number {
    const beforeTokens = tokenizeExpression(before).filter(token => !/^\s+$/u.test(token));
    const afterTokens = tokenizeExpression(after).filter(token => !/^\s+$/u.test(token));
    const unchangedLength = diffSequence(beforeTokens, afterTokens)
        .filter(operation => operation.kind === "unchanged")
        .reduce((length, operation) => length + operation.value.length, 0);
    const totalLength = Math.max(
        beforeTokens.join("").length,
        afterTokens.join("").length,
    );
    return totalLength === 0 ? 0 : unchangedLength / totalLength;
}

function alignChangedLines(removed: string[], added: string[]): Array<[string | undefined, string | undefined]> {
    const scores = Array.from(
        { length: removed.length + 1 },
        () => new Array<number>(added.length + 1).fill(0),
    );

    for (let i = removed.length - 1; i >= 0; i -= 1) {
        for (let j = added.length - 1; j >= 0; j -= 1) {
            const similarity = getLineSimilarity(removed[i], added[j]);
            scores[i][j] = Math.max(
                scores[i + 1][j],
                scores[i][j + 1],
                similarity >= 0.3 ? similarity + scores[i + 1][j + 1] : 0,
            );
        }
    }

    const lines: Array<[string | undefined, string | undefined]> = [];
    let i = 0;
    let j = 0;
    while (i < removed.length && j < added.length) {
        const similarity = getLineSimilarity(removed[i], added[j]);
        if (similarity >= 0.3 && scores[i][j] === similarity + scores[i + 1][j + 1]) {
            lines.push([removed[i++], added[j++]]);
        } else if (scores[i][j + 1] >= scores[i + 1][j]) {
            lines.push([undefined, added[j++]]);
        } else {
            lines.push([removed[i++], undefined]);
        }
    }
    while (i < removed.length) lines.push([removed[i++], undefined]);
    while (j < added.length) lines.push([undefined, added[j++]]);
    return lines;
}

function renderChangedDestinationLines(removed: string[], added: string[]): string {
    if (added.length === 0) return "";

    return alignChangedLines(removed, added)
        .map(([before, after]) => {
            if (after === undefined) return "";
            if (before === undefined) return renderVCLine(renderChangedFragment(after));
            const change = renderDestinationTokenDiff(before, after);
            return renderVCLine(change.content, change.hasAddedContent ? "" : "vc-change-line");
        })
        .join("");
}

export function renderImplication(node: VCImplication): string {
    return getImplicationLines(node)
        .map(predicate => renderVCLine(renderHighlightedInlineExpression(predicate)))
        .join("");
}

export function renderImplicationChange(before: VCImplication, after: VCImplication): string {
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
        lines.push(renderChangedDestinationLines(removed, added));
    }

    return lines.join("");
}
