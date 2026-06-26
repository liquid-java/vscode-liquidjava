import type { VCImplication } from "../../../types/vc-implications";
import { renderHighlightedInlineExpression } from "../../highlighting";
import { escapeHtml } from "../../utils";

type ChangeKind = "unchanged" | "removed" | "added";
type DiffOperation<T> = { kind: ChangeKind; value: T };

const MIN_LINE_SIMILARITY = 0.3;
const TOKEN_PATTERN = /\s+|-->|&&|\|\||==|!=|<=|>=|[a-zA-Z_#][a-zA-Z0-9_#⁰¹²³⁴⁵⁶⁷⁸⁹]*|\d+(?:\.\d+)?|[^\s]/gu;
const WHITESPACE_PATTERN = /^\s+$/u;
const VC_LINE_SEPARATOR = "\t";

function hasBinder(node: VCImplication): boolean {
    return typeof node.name === "string" && node.name.length > 0;
}

function formatImplicationLine(node: VCImplication): string {
    const binder = hasBinder(node) ? `∀${node.name}` : "";
    const type = typeof node.type === "string" ? node.type : "";
    return [binder, type, node.predicate].join(VC_LINE_SEPARATOR);
}

function parseImplicationLine(line: string): { binder: string; type: string; predicate: string } {
    const [binder = "", type = "", predicate = ""] = line.split(VC_LINE_SEPARATOR);
    return { binder, type, predicate };
}

function getImplicationLines(node: VCImplication): string[] {
    const lines: string[] = [];
    for (let current: VCImplication | null = node; current; current = current.next) {
        if (current.next && !hasBinder(current)) continue;
        lines.push(formatImplicationLine(current));
    }
    return lines;
}

function renderVCLine(line: string, className = "", predicateContent?: string): string {
    const { binder, type, predicate } = parseImplicationLine(line);
    const title = binder && type ? ` title="${escapeHtml(`${binder.slice(1)}: ${type}`)}"` : "";

    return /*html*/`
        <div class="vc-line ${className}">
            <div class="vc-binder-cell"${title}><span class="vc-node vc-binder">${escapeHtml(binder)}</span></div>
            <div class="vc-predicate-cell"><span class="vc-node">${predicateContent ?? renderHighlightedInlineExpression(predicate)}</span></div>
        </div>
    `;
}

function createMatrix(rows: number, columns: number): number[][] {
    return Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));
}

function diffSequence<T>(before: T[], after: T[]): DiffOperation<T>[] {
    const lengths = createMatrix(before.length, after.length);

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
            beforeIndex++;
            afterIndex++;
        } else if (lengths[beforeIndex + 1][afterIndex] >= lengths[beforeIndex][afterIndex + 1]) {
            operations.push({ kind: "removed", value: before[beforeIndex++] });
        } else {
            operations.push({ kind: "added", value: after[afterIndex++] });
        }
    }
    operations.push(
        ...before.slice(beforeIndex).map(value => ({ kind: "removed" as const, value })),
        ...after.slice(afterIndex).map(value => ({ kind: "added" as const, value })),
    );
    return operations;
}

function tokenizeExpression(expression: string): string[] {
    return expression.match(TOKEN_PATTERN) || [];
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
            if (WHITESPACE_PATTERN.test(operation.value) && changedContent && operations[index + 1]?.kind === "added") {
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
    const beforeTokens = tokenizeExpression(before).filter(token => !WHITESPACE_PATTERN.test(token));
    const afterTokens = tokenizeExpression(after).filter(token => !WHITESPACE_PATTERN.test(token));
    const unchangedLength = diffSequence(beforeTokens, afterTokens)
        .filter(operation => operation.kind === "unchanged")
        .reduce((length, operation) => length + operation.value.length, 0);
    const totalLength = Math.max(beforeTokens.join("").length, afterTokens.join("").length);
    return totalLength === 0 ? 0 : unchangedLength / totalLength;
}

function alignChangedLines(removed: string[], added: string[]): Array<[string | undefined, string | undefined]> {
    const similarities = removed.map(before => added.map(after => getLineSimilarity(before, after)));
    const scores = createMatrix(removed.length, added.length);

    for (let i = removed.length - 1; i >= 0; i -= 1) {
        for (let j = added.length - 1; j >= 0; j -= 1) {
            const similarity = similarities[i][j];
            scores[i][j] = Math.max(
                scores[i + 1][j],
                scores[i][j + 1],
                similarity >= MIN_LINE_SIMILARITY ? similarity + scores[i + 1][j + 1] : 0,
            );
        }
    }

    const lines: Array<[string | undefined, string | undefined]> = [];
    let i = 0;
    let j = 0;
    while (i < removed.length && j < added.length) {
        const similarity = similarities[i][j];
        if (
            similarity >= MIN_LINE_SIMILARITY
            && scores[i][j] === similarity + scores[i + 1][j + 1]
        ) {
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
            if (before === undefined) return renderVCLine(after, "vc-change-line");
            const change = renderDestinationTokenDiff(
                parseImplicationLine(before).predicate,
                parseImplicationLine(after).predicate,
            );
            return renderVCLine(after, change.hasAddedContent ? "" : "vc-change-line", change.content);
        })
        .join("");
}

export function renderImplication(node: VCImplication): string {
    return getImplicationLines(node)
        .map(line => renderVCLine(line))
        .join("");
}

export function renderImplicationChange(before: VCImplication, after: VCImplication): string {
    const operations = diffSequence(getImplicationLines(before), getImplicationLines(after));
    let html = "";
    const changed = { removed: [] as string[], added: [] as string[] };

    const flushChanges = () => {
        html += renderChangedDestinationLines(changed.removed, changed.added);
        changed.removed.length = 0;
        changed.added.length = 0;
    };

    for (const operation of operations) {
        if (operation.kind === "unchanged") {
            flushChanges();
            html += renderVCLine(operation.value);
            continue;
        }
        changed[operation.kind].push(operation.value);
    }

    flushChanges();
    return html;
}
