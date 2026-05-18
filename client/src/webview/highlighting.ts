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

function colorForScope(scope: string): string {
    if (scope.includes("keyword.other") || scope.includes("variable.language.this")) return "var(--lj-token-keyword)";
    if (scope.includes("keyword.control")) return "var(--lj-token-control)";
    if (scope.includes("entity.name.function")) return "var(--lj-token-function)";
    if (scope.includes("keyword.operator")) return "var(--lj-token-operator)";
    if (scope.includes("punctuation.separator")) return "var(--lj-token-punctuation)";
    if (scope.includes("storage.type.primitive") || scope.includes("entity.name.type")) return "var(--lj-token-type)";
    if (scope.includes("constant.numeric")) return "var(--lj-token-number)";
    if (scope.includes("constant.language.boolean") || scope.includes("constant.language.null")) return "var(--lj-token-boolean)";
    if (scope.includes("variable.other")) return "var(--lj-token-identifier)";

    return "var(--vscode-editor-foreground)";
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

export function renderHighlightedExpression(expression: string): string {
    if (!expression) return "";

    return `<pre class="lj-expression-block"><code class="lj-expression-code">${renderHighlightedContent(expression)}</code></pre>`;
}

export function renderHighlightedInlineExpression(expression: string): string {
    if (!expression) return "";

    return renderHighlightedContent(expression);
}
