import * as vscode from "vscode";
import { LIQUIDJAVA_SCOPES } from "../utils/constants";

type TMRule = {
    scope: string | string[];
    settings: { fontStyle?: string; foreground?: string }
};

/**
 * Apply italic fontStyle to LiquidJava TextMate scopes
 * This preserves the active theme's colors and only adds italic style to injected tokens
 */
export async function applyItalicOverlay() {
    const config = vscode.workspace.getConfiguration();
    const enabled = config.get<boolean>("liquidjava.applyItalicOverlay", true);
    if (!enabled) return;

    const italicRule: TMRule = { scope: LIQUIDJAVA_SCOPES, settings: { fontStyle: "italic" } };
    const current = config.get<any>("editor.tokenColorCustomizations") || {};
    const existingRules: TMRule[] = current.textMateRules || [];
   
    // remove previous overlay if present to avoid duplication
    const filteredRules = existingRules.filter((rule) => {
        if (!rule || !rule.settings || !rule.settings.fontStyle) return true;
        const str = rule.scope;
        const scopes = Array.isArray(str) ? str : [str];
        const hasLiquidJavaScope = scopes?.some((x) => typeof x === "string" && x.includes("liquidjava"));
        return !hasLiquidJavaScope;
    });

    const next = {
        ...current,
        textMateRules: [...filteredRules, italicRule],
    };

    await config.update("editor.tokenColorCustomizations", next, vscode.ConfigurationTarget.Global);
}