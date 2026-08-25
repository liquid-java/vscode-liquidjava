import * as vscode from "vscode";
import { LIQUIDJAVA_ANNOTATION_START, LJAnnotation } from "../utils/constants";

/**
 * Returns the LiquidJava annotation containing the given position
 */
export function getActiveLiquidJavaAnnotation(document: vscode.TextDocument, position: vscode.Position): LJAnnotation | null {
    const textUntilCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    LIQUIDJAVA_ANNOTATION_START.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    let lastAnnotationStart = -1;
    let lastAnnotationName: LJAnnotation | null = null;
    while ((match = LIQUIDJAVA_ANNOTATION_START.exec(textUntilCursor)) !== null) {
        lastAnnotationStart = match.index;
        lastAnnotationName = match[2] ? match[2] as LJAnnotation : null;
    }
    if (lastAnnotationStart === -1 || !lastAnnotationName) return null;

    const fromLastAnnotation = textUntilCursor.slice(lastAnnotationStart);
    let parenthesisDepth = 0;
    let isInsideString = false;
    for (let i = 0; i < fromLastAnnotation.length; i++) {
        const char = fromLastAnnotation[i];
        const previousChar = i > 0 ? fromLastAnnotation[i - 1] : "";
        if (char === '"' && previousChar !== "\\") {
            isInsideString = !isInsideString;
            continue;
        }
        if (isInsideString) continue;
        if (char === "(") parenthesisDepth++;
        if (char === ")") {
            parenthesisDepth--;
            if (parenthesisDepth === 0) return null;
        }
    }
    return parenthesisDepth > 0 ? lastAnnotationName : null;
}
