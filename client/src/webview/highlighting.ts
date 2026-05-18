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

const expressionPatterns: GrammarPattern[] = [
    { match: "\\b(return|break|continue|if|else|switch|case|default|for|while|do|try|catch|finally|throw|throws|new)\\b", name: "keyword.control.liquidjava.webview" },
    ...repository.keywords.patterns,
    ...repository.functions.patterns,
    ...repository.operators.patterns,
    { match: "\\b[a-zA-Z_][a-zA-Z0-9_#⁰¹²³⁴⁵⁶⁷⁸⁹]*(?=\\s*\\()", name: "entity.name.function.liquidjava.webview" },
    { match: "\\b[A-Z][a-zA-Z0-9_]*(?=\\s*\\()", name: "entity.name.function.constructor.liquidjava.webview" },
    ...repository["qualified-names"].patterns,
    { match: "\\b(byte|short|long|char|void)\\b", name: "storage.type.primitive.liquidjava.webview" },
    ...repository.types.patterns,
    { match: "\\bnull\\b", name: "constant.language.null.liquidjava.webview" },
    ...repository.literals.patterns,
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
            html += escapeHtml(expression[index]);
            index += 1;
            continue;
        }
        matchingRule.regex.lastIndex = index;
        const match = matchingRule.regex.exec(expression);
        const content = match?.[0] || expression[index];

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

export function renderHighlightedInlineExpression(expression: string): string {
    return renderExpression(expression, false);
}
