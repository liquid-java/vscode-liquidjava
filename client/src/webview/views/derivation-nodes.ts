import type { LJError, RefinementError } from "../../types/diagnostics";
import type { DerivationNode, ValDerivationNode } from "../../types/derivation-nodes";

// Handles rendering and interaction of derivation nodes in refinement errors

const expansionsMap = new Map<string, Set<string>>();

function getExpansions(errorId: string): Set<string> {
    if (!expansionsMap.has(errorId)) {
        expansionsMap.set(errorId, new Set());
    }
    return expansionsMap.get(errorId)!;
}

function renderJsonTree(
    error: RefinementError,
    node: DerivationNode | undefined,
    errorId: string,
    path: string,
    expandedPaths: Set<string>
): string {
    if (!node)
        return '<span class="node-value">undefined</span>';

    const hasOrigin = Boolean("origin" in node && node.origin);
    const isExpanded = expandedPaths.has(path);
    if (hasOrigin && isExpanded && "origin" in node) {
        return renderJsonTree(error, node.origin, errorId, path, expandedPaths);
    }
    
    // VarDerivationNode
    if ("var" in node) {
        const placement = error.translationTable?.[node.var];
        if (!placement) return `<span class="node-var">${node.var}</span>`;
        
        const filePath = (placement as any)?.file ?? error.file;
        const filename = filePath.split("/").pop() ?? "";
        const tooltipData = `${filename}:${(placement.position?.line ?? 0) + 1}`;
        const classes = `node-var tooltip clickable ${hasOrigin ? "derivable-node" : ""}`.trim();
        const attrs = hasOrigin ? ` data-node-path="${path}" data-error-id="${errorId}"` : "";
        const fileAttr = ` data-file="${filePath}" data-line="${placement.position?.line ?? 0}" data-column="${placement.position?.column ?? 0}"`;
        return `<span class="${classes}" data-tooltip="${tooltipData}"${fileAttr}${attrs}>${node.var}</span>`;
    }

    // ValDerivationNode
    if ("value" in node) {
        const valueNode = node as ValDerivationNode;
        const valClass = typeof valueNode.value === "number" ? "node-number" : typeof valueNode.value === "boolean" ? "node-boolean" : "node-value";
        const clickableClass = hasOrigin ? "derivable-node clickable" : "";
        const pathAttr = hasOrigin ? `data-node-path="${path}"` : "";
        const idAttr = hasOrigin ? `data-error-id="${errorId}"` : "";
        return `<span class="${valClass} ${clickableClass}" ${pathAttr} ${idAttr}>${valueNode.value}</span>`;
    }

    // BinaryDerivationNode
    if ("left" in node && "right" in node) {
        const leftHtml = renderJsonTree(error, node.left, errorId, `${path}.left`, expandedPaths);
        const rightHtml = renderJsonTree(error, node.right, errorId, `${path}.right`, expandedPaths);
        return `${leftHtml} ${node.op} ${rightHtml}`;
    }

    // UnaryDerivationNode
    if ("operand" in node) {
        const operandHtml = renderJsonTree(error, node.operand, errorId, `${path}.operand`, expandedPaths);
        return node.op === "-" ? `${node.op}(${operandHtml})` : `${node.op}${operandHtml}`;
    }

    // fallback
    return `<span class="node-value">${JSON.stringify(node)}</span>`;
}

function hashError(error: LJError): string {
    const content = `${error.title}|${error.message}|${error.file}|${error.position?.lineStart ?? 0}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `error_${Math.abs(hash)}`;
}

export function handleDerivableNodeClick(target?: any): boolean {
    if (!target) return false;
    
    const nodePath = target.getAttribute("data-node-path");
    const errorId = target.getAttribute("data-error-id");
    if (nodePath && errorId !== null) {
        const paths = getExpansions(errorId);
        if (!paths.has(nodePath)) {
            paths.add(nodePath);
        }
        return true;
    }
    return false;
}

export function handleDerivationResetClick(target?: any): boolean {
    if (!target) return false;

    const errorId = target.getAttribute("data-error-id");
    if (errorId !== null) {
        expansionsMap.delete(errorId);
        return true;
    }
    return false;
}

export function renderDerivationNode(error: RefinementError, node: ValDerivationNode): string {
    if (!node.origin) return `<pre>${node.value}</pre>`; // no derivation available
    
    const errorId = hashError(error);
    const expansions = getExpansions(errorId);
    return /*html*/ `
        <div class="container derivation-container" data-error-id="${errorId}">
            <div style="flex: 1;">
                ${renderJsonTree(error, node.origin || node, errorId, "root", expansions)}
                ${expansions.size === 0 ? '<span class="node-expand-indicator">&nbsp;(click to expand)</span>' : ''}
            </div>
            <button class="reset-btn derivation-reset-btn" data-error-id="${errorId}" ${expansions.size === 0 ? "disabled" : ""}>
                ↻
            </button>
        </div>
    `;
}