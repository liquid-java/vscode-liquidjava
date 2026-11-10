import * as liquidJavaGrammar from "../../syntaxes/liquidjava.json";
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

const repository = liquidJavaGrammar.repository as GrammarRepository;
const patterns = (name: string): GrammarPattern[] => repository[name]?.patterns || [];

const expressionPatterns: GrammarPattern[] = [
    { match: "\\b(return|break|continue|if|else|switch|case|default|for|while|do|try|catch|finally|throw|throws|new)\\b", name: "keyword.control.liquidjava.webview" },
    ...patterns("keywords"),
    ...patterns("functions"),
    ...patterns("operators"),
    { match: "\\b[a-zA-Z_][a-zA-Z0-9_#⁰¹²³⁴⁵⁶⁷⁸⁹]*(?=\\s*\\()", name: "entity.name.function.liquidjava.webview" },
    { match: "\\b[A-Z][a-zA-Z0-9_]*(?=\\s*\\()", name: "entity.name.function.constructor.liquidjava.webview" },
    ...patterns("qualified-names"),
    { match: "\\b(byte|short|long|char|void)\\b", name: "storage.type.primitive.liquidjava.webview" },
    ...patterns("types"),
    { match: "\\bnull\\b", name: "constant.language.null.liquidjava.webview" },
    ...patterns("literals"),
    { match: "[(){}.,;\\[\\]]", name: "punctuation.separator.liquidjava" },
    { match: "#*[a-zA-Z_][a-zA-Z0-9_#⁰¹²³⁴⁵⁶⁷⁸⁹]*", name: "variable.other.liquidjava" }
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

function renderHighlightedContent(expression: string): string {
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

        html += `<span style="color:${colorForScope(matchingRule.scope)}">${escapeHtml(content)}</span>`;
        index += content.length;
    }
    return html;
}

function renderExpression(expression: string, wrap: boolean): string {
    if (!expression) return "";

    const content = renderHighlightedContent(expression);
    return wrap
        ? `<pre class="lj-expression-block"><code class="lj-expression-code">${content}</code></pre>`
        : content;
}

export function renderHighlightedExpression(expression: string): string {
    return renderExpression(expression, true);
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
    renderText: (text: string, index: number) => string = renderHighlightedContent,
    trailing = "",
): string {
    return lines.map((line, index) => {
        const end = index === lines.length - 1 ? trailing : "";
        return `<span class="lj-line${line.branch ? " lj-line-branch" : ""}">${renderText(line.text, index)}${end}</span>`;
    }).join("");
}

/**
 * Renders an expression on the lines of getExpressionLines, in an expression block as renderHighlightedExpression does
 */
export function renderHighlightedLines(expression: string): string {
    if (!expression) return "";

    const html = renderExpressionLines(getExpressionLines(expression));
    return `<pre class="lj-expression-block"><code class="lj-expression-code">${html}</code></pre>`;
}

export function renderHighlightedInlineExpression(expression: string): string {
    return renderExpression(expression, false);
}
