import { createHighlighterCoreSync } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import * as liquidJavaGrammar from "../../syntaxes/liquidjava.json";
import { escapeHtml } from "./utils";

type TextMateGrammar = {
    name: string;
    scopeName: string;
    patterns: unknown[];
    repository: Record<string, unknown>;
};

const EXPRESSION_LANGUAGE_ID = "liquidjava-expression";
const EXPRESSION_THEME = "liquidjava-webview";

const expressionGrammar: TextMateGrammar = {
    name: EXPRESSION_LANGUAGE_ID,
    scopeName: "source.liquidjava.expression",
    patterns: [
        { match: "\\b(return|break|continue|if|else|switch|case|default|for|while|do|try|catch|finally|throw|throws|new)\\b", name: "keyword.control.liquidjava.webview" },
        { include: "#keywords" },
        { include: "#functions" },
        { include: "#operators" },
        { match: "\\b[A-Z][a-zA-Z0-9_]*(?=\\s*\\()", name: "entity.name.function.constructor.liquidjava.webview" },
        { include: "#qualified-names" },
        { match: "\\b(byte|short|long|char|void)\\b", name: "storage.type.primitive.liquidjava.webview" },
        { include: "#types" },
        { match: "\\bnull\\b", name: "constant.language.null.liquidjava.webview" },
        { include: "#literals" },
        { match: "[(){}.,;\\[\\]]", name: "punctuation.separator.liquidjava" },
        { match: "#*[a-zA-Z_][a-zA-Z0-9_#⁰¹²³⁴⁵⁶⁷⁸⁹]*", name: "variable.other.liquidjava" }
    ],
    repository: liquidJavaGrammar.repository
};

const highlighter = createHighlighterCoreSync({
    engine: createJavaScriptRegexEngine(),
    langs: [expressionGrammar],
    themes: [
        {
            name: EXPRESSION_THEME,
            settings: [
                {
                    settings: { foreground: "var(--vscode-editor-foreground)" }
                },
                {
                    scope: "keyword.other.liquidjava, variable.language.this.liquidjava",
                    settings: { foreground: "var(--lj-token-keyword)" }
                },
                {
                    scope: "keyword.control.liquidjava.webview",
                    settings: { foreground: "var(--lj-token-control)" }
                },
                {
                    scope: "entity.name.function.liquidjava, entity.name.function.constructor.liquidjava.webview",
                    settings: { foreground: "var(--lj-token-function)" }
                },
                {
                    scope: "keyword.operator.liquidjava",
                    settings: { foreground: "var(--lj-token-operator)" }
                },
                {
                    scope: "storage.type.primitive.liquidjava, storage.type.primitive.liquidjava.webview, entity.name.type.liquidjava",
                    settings: { foreground: "var(--lj-token-type)" }
                },
                {
                    scope: "entity.name.type.class.liquidjava",
                    settings: { foreground: "var(--lj-token-type)" }
                },
                {
                    scope: "constant.numeric.liquidjava",
                    settings: { foreground: "var(--lj-token-number)" }
                },
                {
                    scope: "constant.language.boolean.liquidjava, constant.language.null.liquidjava.webview",
                    settings: { foreground: "var(--lj-token-boolean)" }
                },
                {
                    scope: "variable.other.liquidjava",
                    settings: { foreground: "var(--lj-token-identifier)" }
                }
            ]
        }
    ]
});

export function renderHighlightedExpression(expression: string): string {
    if (!expression) return "";

    try {
        return highlighter.codeToHtml(expression, {
            lang: EXPRESSION_LANGUAGE_ID,
            theme: EXPRESSION_THEME,
            transformers: [
                {
                    pre(node) {
                        const className = Array.isArray(node.properties.className) ? node.properties.className : [];
                        node.properties.className = [...className, "lj-expression-block"];
                        delete node.properties.style;
                    },
                    code(node) {
                        const className = Array.isArray(node.properties.className) ? node.properties.className : [];
                        node.properties.className = [...className, "lj-expression-code"];
                    }
                }
            ]
        });
    } catch {
        return `<pre class="lj-expression-block"><code class="lj-expression-code">${escapeHtml(expression)}</code></pre>`;
    }
}

export function renderHighlightedInlineExpression(expression: string): string {
    if (!expression) return "";

    try {
        const tokens = highlighter.codeToTokens(expression, {
            lang: EXPRESSION_LANGUAGE_ID,
            theme: EXPRESSION_THEME
        });
        return tokens.tokens
            .map(line => line
                .map(token => `<span style="color:${token.color || "var(--vscode-editor-foreground)"}">${escapeHtml(token.content)}</span>`)
                .join(""))
            .join("<br>");
    } catch {
        return escapeHtml(expression);
    }
}
