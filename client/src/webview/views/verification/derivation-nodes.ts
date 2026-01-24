import type { LJError, RefinementError } from "../../../types/diagnostics";
import type { DerivationNode, ValDerivationNode } from "../../../types/derivation-nodes";

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
    if (!node) return /*html*/`<span class="node-value">undefined</span>`;

    const hasOrigin = Boolean("origin" in node && node.origin);
    const isExpanded = expandedPaths.has(path);

    if (hasOrigin && isExpanded && "origin" in node) {
        return renderJsonTree(error, node.origin, errorId, path, expandedPaths);
    }

    console.log("Rendering node:", node);
    
    // VarDerivationNode
    if ("var" in node) {
        const placement = error.translationTable?.[node.var];
        if (!placement) return `<span class="node-var">${node.var}</span>`;
        
        const filePath = (placement as any)?.file ?? error.file;
        const filename = filePath.split("/").pop() ?? "";
        const tooltipData = `${filename}:${(placement.position?.line ?? 0) + 1}`;
        const classes = `node-var tooltip clickable ${hasOrigin ? "derivable-node" : ""}`.trim();
        const attrs = hasOrigin ? ` data-node-path="${path}" data-node-id="${errorId}"` : "";
        const fileAttr = ` data-file="${filePath}" data-line="${placement.position?.line ?? 0}" data-column="${placement.position?.column ?? 0}"`;
        return `<span class="${classes}" data-tooltip="${tooltipData}"${fileAttr}${attrs}>${node.var}</span>`;
    }

    // ValDerivationNode
    if ("value" in node) {
        const valueNode = node as ValDerivationNode;
        const valClass = typeof valueNode.value === "number" ? "node-number" : typeof valueNode.value === "boolean" ? "node-boolean" : "node-value";
        const clickableClass = hasOrigin ? "derivable-node clickable" : "";
        const pathAttr = hasOrigin ? `data-node-path="${path}"` : "";
        const idAttr = hasOrigin ? `data-node-id="${errorId}"` : "";
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

function hashNode(node: ValDerivationNode): string {
    const content = JSON.stringify(node);
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
    const errorId = target.getAttribute("data-node-id");

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

    const errorId = target.getAttribute("data-node-id");
    if (errorId !== null) {
        expansionsMap.delete(errorId);
        return true;
    }
    return false;
}

export function renderDerivationNode(error: RefinementError, node: ValDerivationNode): string {
    if (!node.origin) return /*html*/`<pre>${node.value}</pre>`; // no derivation available
    
    const nodeId = hashNode(node);
    const expansions = getExpansions(nodeId);
    const flattenedNode = flattenTree(node);
    
    return /*html*/`
        <div class="container derivation-container" data-node-id="${nodeId}">
            <div style="flex: 1;">
                ${renderJsonTree(error, flattenedNode, nodeId, "root", expansions)}
            </div>
            <button class="reset-btn derivation-reset-btn" data-node-id="${nodeId}" ${expansions.size === 0 ? "disabled" : ""}>
                ↻
            </button>
        </div>
    `;
}

/**
 * Flattens the tree by removing nodes whose value is equivalent to their origin
 * @param node DerivationNode
 * @returns flattened DerivationNode
 */
function flattenTree(node: DerivationNode): DerivationNode | undefined {
    if (!node) return;

    console.log("Flattening node:", node);

    // if node is equivalent to its origin, skip to the origin
    if (isNodeValueEquivalentToOrigin(node) && "origin" in node && node.origin) {
        return flattenTree(node.origin);
    }

    // BinaryDerivationNode
    if ("left" in node && "right" in node) {
        const result: any = {
            ...node,
            left: flattenTree(node.left),
            right: flattenTree(node.right)
        };

        // also flatten origin if present
        if ("origin" in node && node.origin) {
            result.origin = flattenTree(node.origin as ValDerivationNode);
        }
        return result;
    }

    // UnaryDerivationNode
    if ("operand" in node) {
        const result: any = {
            ...node,
            operand: flattenTree(node.operand)
        };

        // also flatten origin if present
        if ("origin" in node && node.origin) {
            result.origin = flattenTree(node.origin as ValDerivationNode);
        }
        return result;
    }

    // ValDerivationNode or VarDerivationNode
    if ("origin" in node && node.origin) {
        return {
            ...node,
            origin: flattenTree(node.origin)
        } as DerivationNode;
    }
    return node;
}
/**
 * Checks if a node's value is equivalent to what its origin would render
 * @param node DerivationNode
 * @returns boolean
 */
function isNodeValueEquivalentToOrigin(node: DerivationNode): boolean {
    if (!("origin" in node) || !node.origin || !("value" in node)) return false;
    const nodeValue = String(node.value);
    const originRendered = getNodeRenderedValue(node.origin);
    return nodeValue === originRendered;
}

/**
 * Gets the rendered value of a derivation node as a string
 * @param node DerivationNode
 * @returns string representation of the node
 */
function getNodeRenderedValue(node: DerivationNode): string {
    if ("value" in node) return String(node.value);
    if ("var" in node) return node.var;
    
    if ("left" in node && "right" in node) {
        const left = getNodeRenderedValue(node.left);
        const right = getNodeRenderedValue(node.right);
        return `${left} ${node.op} ${right}`;
    }
    
    if ("operand" in node) {
        const operand = getNodeRenderedValue(node.operand);
        return node.op === "-" ? `-(${operand})` : `${node.op}${operand}`;
    }
    return ""
}
