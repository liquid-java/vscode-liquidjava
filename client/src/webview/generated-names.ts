import type { PlacementInCode, SourcePosition } from "../types/diagnostics";
import { escapeHtml } from "./utils";

// what a value the verifier names stands for, given where it is (" at line 12", or empty when unknown)
type Description = (at: string) => string;

const NAMED_VALUES = new Map<string, Description>(Object.entries({
    if_condition: at => `the condition of the if${at}`,
    loop_condition: at => `the condition of the loop${at}`,
    ternary_condition: at => `the condition of the ? :${at}`,
    switch_selector: at => `the value the switch${at} checks`,
    case_condition: at => `whether the case${at} matches`,
    try_branch: at => `whether the try block${at} runs to its end, rather than a catch block`,
    catch_branch: at => `whether this catch block of the try${at} runs, rather than a later one`,
    array_length: at => `the length of the array created${at}`,
    operation_result: at => `the result of the operation${at}`,
    expression_value: at => `the value of the expression${at}`,
} satisfies Record<string, Description>));

// values named after the code they come from: a call, a new object or a field read
const VALUES_OF_CODE: [RegExp, (code: string) => Description][] = [
    [/^new_(\w+)$/, type => at => `the new ${type} object created${at}`],
    [/^(\w+)_result$/, method => at => `the value returned by the call to ${method}()${at}`],
    [/^(\w+)_value$/, field => at => `the value of the field ${field} read${at}`],
];

function describe(name: string): Description | undefined {
    const kind = name.slice(1);
    if (!name.startsWith("#") || !kind) return undefined;
    const named = NAMED_VALUES.get(kind);
    if (named) return named;
    for (const [pattern, describeCode] of VALUES_OF_CODE) {
        const code = pattern.exec(kind)?.[1];
        if (code) return describeCode(code);
    }
    return undefined;
}

/** Whether a name, written without its line tag, is one the verifier gives a value of the code, such as #if_condition */
export function isGeneratedName(name: string): boolean {
    return describe(name) !== undefined;
}

// says in plain words what a value the verifier names stands for, such as "The condition of the if at line 12"
function explain(name: string, line?: number): string {
    const description = describe(name)?.(line === undefined ? "" : ` at line ${line}`) ?? "";
    return `${description.charAt(0).toUpperCase()}${description.slice(1)}. LiquidJava gives it the name ${name}.`;
}

/**
 * The hover text of a name the verifier gives a value of the code: what the value is, and where when it is known
 * @param name the name without its line tag
 * @param position where the value comes from, if known; it is a link when it has a file
 * @param tagLine the line of the name's line tag, used when the position is not known
 */
export function generatedNameTitle(name: string, position?: SourcePosition | null, tagLine?: number): string {
    const explanation = explain(name, position ? position.lineStart + 1 : tagLine);
    return position?.file ? `${explanation} Click to go to it.` : explanation;
}

/**
 * Renders a name the verifier gives a value of the code, explained on hover and, when its place is known, a link to it
 * @param name the name without its line tag
 * @param content the name as rendered, with its line tag
 * @param tagLine the line of its line tag, if it has one
 * @param place where the value comes from, if known
 */
export function renderGeneratedName(name: string, content: string, tagLine?: number, place?: PlacementInCode): string {
    const position = place?.position;
    const title = escapeHtml(generatedNameTitle(name, position, tagLine));
    if (!position?.file) return `<span class="lj-generated-name" title="${title}">${content}</span>`;
    return /*html*/`<span class="lj-generated-name location-link" title="${title}" data-file="${escapeHtml(position.file)}" data-line="${position.lineStart}" data-column="${position.colStart}">${content}</span>`;
}
