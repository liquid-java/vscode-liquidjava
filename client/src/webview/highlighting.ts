import * as liquidJavaGrammar from "../../syntaxes/liquidjava.json";
import type { TranslationTable } from "../types/diagnostics";
import { isGeneratedName, renderGeneratedName } from "./generated-names";
import { escapeHtml } from "./utils";

type GrammarPattern = {
    match?: string;
    name?: string;
};

type GrammarRepository = Record<string, { patterns?: GrammarPattern[] }>;

type HighlightRule = {
    regex: RegExp;
    scope: string;
};

type ScopeColorRule = {
    scopes: string[];
    color: string;
};

// the tag the verifier gives a variable written like others in an error: the line its value comes from, x@12,
// numbered when values share a line or have none, x@12#2 and x#2
export const LINE_TAG = "@\\d+(?:#\\d+)?\\b|(?<=[\\w)])#\\d+\\b";
const LINE_TAG_SCOPE = "line-tag";
const VARIABLE_SCOPE = "variable.other.liquidjava";
const LINE_TAG_AT_INDEX = new RegExp(LINE_TAG, "y");
// string and character literals, whose text is shown as it is even where it looks like a line tag
export const LITERAL = `"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'`;
const LINE_TAGS_OUTSIDE_LITERALS = new RegExp(`${LITERAL}|${LINE_TAG}`, "g");

const repository = liquidJavaGrammar.repository as GrammarRepository;
const patterns = (name: string): GrammarPattern[] => repository[name]?.patterns || [];

const expressionPatterns: GrammarPattern[] = [
    { match: LITERAL, name: "string.quoted.liquidjava.webview" },
    { match: LINE_TAG, name: LINE_TAG_SCOPE },
    { match: "\\b(return|break|continue|if|else|switch|case|default|for|while|do|try|catch|finally|throw|throws|new)\\b", name: "keyword.control.liquidjava.webview" },
    ...patterns("keywords"),
    ...patterns("functions"),
    ...patterns("operators"),
    { match: "\\b[a-zA-Z_][a-zA-Z0-9_#]*(?=\\s*\\()", name: "entity.name.function.liquidjava.webview" },
    { match: "\\b[A-Z][a-zA-Z0-9_]*(?=\\s*\\()", name: "entity.name.function.constructor.liquidjava.webview" },
    ...patterns("qualified-names"),
    { match: "\\b(byte|short|long|char|void)\\b", name: "storage.type.primitive.liquidjava.webview" },
    ...patterns("types"),
    { match: "\\bnull\\b", name: "constant.language.null.liquidjava.webview" },
    ...patterns("literals"),
    { match: "[(){}.,;\\[\\]]", name: "punctuation.separator.liquidjava" },
    { match: "#*[a-zA-Z_](?:[a-zA-Z0-9_]|#(?!\\d))*", name: VARIABLE_SCOPE }
];

const highlightRules: HighlightRule[] = expressionPatterns
    .filter((pattern): pattern is Required<GrammarPattern> => Boolean(pattern.match && pattern.name))
    .map(pattern => ({
        regex: new RegExp(pattern.match, "y"),
        scope: pattern.name
    }));

const scopeColorRules: ScopeColorRule[] = [
    { scopes: ["keyword.other", "variable.language.this"], color: "var(--lj-token-keyword)" },
    { scopes: ["keyword.control"], color: "var(--lj-token-control)" },
    { scopes: ["entity.name.function"], color: "var(--lj-token-function)" },
    { scopes: ["keyword.operator"], color: "var(--lj-token-operator)" },
    { scopes: ["punctuation.separator"], color: "var(--lj-token-punctuation)" },
    { scopes: ["storage.type.primitive", "entity.name.type"], color: "var(--lj-token-type)" },
    { scopes: ["constant.numeric"], color: "var(--lj-token-number)" },
    { scopes: ["constant.language.boolean", "constant.language.null"], color: "var(--lj-token-boolean)" },
    { scopes: ["variable.other"], color: "var(--lj-token-identifier)" }
];

function colorForScope(scope: string): string {
    return scopeColorRules.find(rule => rule.scopes.some(token => scope.includes(token)))?.color
        ?? "var(--vscode-editor-foreground)";
}

// the variable that ends at an index: a name such as this.items, or a call such as failures.size()
function variableBefore(text: string, end: number): string {
    let start = end;
    for (let depth = 0; start > 0; start--) {
        const c = text[start - 1];
        if (c === ")") depth++;
        else if (c === "(") {
            if (depth === 0) break;
            depth--;
        }
        else if (depth === 0 && !/[\w#.]/.test(c)) break;
    }
    return text.slice(start, end);
}

// a line tag as a subscript, l12, that says which value of the variable it stands for
function renderLineTag(tag: string, variable: string): string {
    const [, line, number] = /^(?:@(\d+))?(?:#(\d+))?$/.exec(tag) ?? [];
    const name = variable || "the variable";
    const value = !number ? `${name} at line ${line}`
        : line ? `the ${ordinal(Number(number))} value ${name} gets at line ${line}`
        : `the ${ordinal(Number(number))} value of ${name} (line unknown)`;
    const text = (line ? `l${line}` : "") + (number ? `#${number}` : "");
    return `<sub class="lj-line-tag" title="${escapeHtml(value)}">${escapeHtml(text)}</sub>`;
}

// 1st, 2nd, 3rd, 4th, ..., 11th, 12th, 13th, ..., 21st
function ordinal(n: number): string {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
    return `${n}${suffix}`;
}

/**
 * Renders text with the line tags of its variables as subscripts, x@12 as x with l12 below
 */
export function renderLineTags(text: string): string {
    let html = "";
    let index = 0;
    for (const match of text.matchAll(LINE_TAGS_OUTSIDE_LITERALS)) {
        if (/^["']/.test(match[0])) continue;
        html += escapeHtml(text.slice(index, match.index)) + renderLineTag(match[0], variableBefore(text, match.index));
        index = match.index + match[0].length;
    }
    return html + escapeHtml(text.slice(index));
}

/** The line of the line tag a name ends with, x@12 or x@12#2, if it has one */
export function lineOfTag(name: string): number | undefined {
    const line = /@(\d+)(?:#\d+)?$/.exec(name)?.[1];
    return line === undefined ? undefined : Number(line);
}

/** The name of a variable without its line tag, as it is written in code */
export function withoutLineTag(name: string): string {
    return name.replace(new RegExp(`(?:${LINE_TAG})$`), "");
}

function renderToken(content: string, scope: string): string {
    return `<span style="color:${colorForScope(scope)}">${escapeHtml(content)}</span>`;
}

/**
 * Renders a name the verifier gives a value of the code, with the line tag after it if any
 * @returns the html and the length of the text it renders
 */
function renderGeneratedNameAt(expression: string, index: number, name: string, places?: TranslationTable): [string, number] {
    LINE_TAG_AT_INDEX.lastIndex = index + name.length;
    const tag = LINE_TAG_AT_INDEX.exec(expression)?.[0] ?? "";
    const content = renderToken(name, VARIABLE_SCOPE) + (tag ? renderLineTag(tag, name) : "");
    const html = renderGeneratedName(name, content, lineOfTag(tag), places?.[name + tag]);
    return [html, name.length + tag.length];
}

/**
 * Renders an expression with its tokens colored
 * @param places where the variables of the expression come from, by name, such as the translation table of an error
 */
function renderHighlightedContent(expression: string, places?: TranslationTable): string {
    let html = "";
    let index = 0;

    while (index < expression.length) {
        const matchingRule = highlightRules.find(rule => {
            rule.regex.lastIndex = index;
            return rule.regex.test(expression);
        });
        if (!matchingRule) {
            html += escapeHtml(expression[index] || "");
            index += 1;
            continue;
        }
        matchingRule.regex.lastIndex = index;
        const match = matchingRule.regex.exec(expression);
        const content = match?.[0] || expression[index] || "";

        if (matchingRule.scope === VARIABLE_SCOPE && isGeneratedName(content)) {
            const [generated, length] = renderGeneratedNameAt(expression, index, content, places);
            html += generated;
            index += length;
            continue;
        }
        html += matchingRule.scope === LINE_TAG_SCOPE
            ? renderLineTag(content, variableBefore(expression, index))
            : renderToken(content, matchingRule.scope);
        index += content.length;
    }
    return html;
}

function renderExpression(expression: string, wrap: boolean, places?: TranslationTable): string {
    if (!expression) return "";

    const content = renderHighlightedContent(expression, places);
    return wrap
        ? `<pre class="lj-expression-block"><code class="lj-expression-code">${content}</code></pre>`
        : content;
}

export function renderHighlightedExpression(expression: string, places?: TranslationTable): string {
    return renderExpression(expression, true, places);
}

const WEAKER_THAN_AND = ["||", "-->", "?"];

// the positions of the characters outside parentheses and string or character literals
function topLevelIndices(expression: string): number[] {
    const indices: number[] = [];
    let depth = 0;
    let quote: string | null = null;
    for (let i = 0; i < expression.length; i++) {
        if (quote) {
            if (expression[i] === "\\") i++;
            else if (expression[i] === quote) quote = null;
        }
        else if (expression[i] === '"' || expression[i] === "'") quote = expression[i];
        else if (expression[i] === "(") depth++;
        else if (expression[i] === ")") depth--;
        else if (depth === 0) indices.push(i);
    }
    return indices;
}

/**
 * Splits an expression at its top-level &&, keeping the && at the end of each conjunct but the last. An && inside
 * parentheses or a literal stays in its conjunct, and nothing is split when a weaker operator (||, -->, ?:)
 * outside them would make the parts look like conjuncts of the whole expression
 */
function splitConjuncts(expression: string): string[] {
    const indices = topLevelIndices(expression);
    if (indices.some(i => WEAKER_THAN_AND.some(operator => expression.startsWith(operator, i)))) return [expression.trim()];

    const conjuncts: string[] = [];
    let start = 0;
    for (const i of indices) {
        if (i < start || !expression.startsWith("&&", i)) continue;
        conjuncts.push(expression.slice(start, i + 2).trim());
        start = i + 2;
    }
    const last = expression.slice(start).trim();
    return last ? [...conjuncts, last] : conjuncts;
}

// the condition and the two branches of an expression that is a conditional outside parentheses, or null
function splitConditional(expression: string): [string, string, string] | null {
    const indices = topLevelIndices(expression);
    const question = indices.find(i => expression[i] === "?");
    if (question === undefined) return null;

    let nested = 0;
    for (const i of indices.filter(i => i > question)) {
        if (expression[i] === "?") nested++;
        else if (expression[i] === ":" && nested-- === 0)
            return [expression.slice(0, question), expression.slice(question + 1, i), expression.slice(i + 1)]
                .map(part => part.trim()) as [string, string, string];
    }
    return null;
}

export type ExpressionLine = { text: string; branch: boolean };

/**
 * The lines an expression is shown on: one per top-level conjunct, and a conditional's condition with each branch
 * on a line of its own, indented
 */
export function getExpressionLines(expression: string): ExpressionLine[] {
    return splitConjuncts(expression).flatMap(conjunct => {
        const conditional = splitConditional(conjunct);
        if (!conditional) return [{ text: conjunct, branch: false }];
        const [condition, then, otherwise] = conditional;
        return [{ text: condition, branch: false }, { text: `? ${then}`, branch: true }, { text: `: ${otherwise}`, branch: true }];
    });
}

/**
 * Renders the lines of an expression, each of which wraps with a hanging indent
 * @param renderText renders the text of the line at an index, highlighted by default
 * @param trailing html shown at the end of the last line
 */
export function renderExpressionLines(
    lines: ExpressionLine[],
    renderText: (text: string, index: number) => string = text => renderHighlightedContent(text),
    trailing = "",
): string {
    return lines.map((line, index) => {
        const end = index === lines.length - 1 ? trailing : "";
        return `<span class="lj-line${line.branch ? " lj-line-branch" : ""}">${renderText(line.text, index)}${end}</span>`;
    }).join("");
}

/**
 * Renders an expression on the lines of getExpressionLines, in an expression block as renderHighlightedExpression does
 * @param places where the variables of the expression come from, by name
 */
export function renderHighlightedLines(expression: string, places?: TranslationTable): string {
    if (!expression) return "";

    const html = renderExpressionLines(getExpressionLines(expression), text => renderHighlightedContent(text, places));
    return `<pre class="lj-expression-block"><code class="lj-expression-code">${html}</code></pre>`;
}

/**
 * Renders an expression inline, with its tokens colored
 * @param places where the variables of the expression come from, by name
 */
export function renderHighlightedInlineExpression(expression: string, places?: TranslationTable): string {
    return renderExpression(expression, false, places);
}
