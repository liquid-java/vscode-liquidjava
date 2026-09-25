// Builds the prompt used to ask a language model to explain a LiquidJava diagnostic.
// Kept free of `vscode` imports so the same code is used by the extension and by the evaluation harness.

import type { LJDiagnostic, SourcePosition, TranslationTable } from "../types/diagnostics";
import type { LJStateMachine } from "../types/fsm";
import type { VCImplication, VCSimplificationResult } from "../types/vc-implications";
import { getPrimer, type PrimerVariant } from "./primer";

/**
 * How much context is given about the error:
 * - L0: verifier message and hint only
 * - L1: + source lines around the error
 * - L2: + the whole source file
 * - L3: + the violated specification and the state machine of the class
 * - L4: + verifier internals (counterexample, verification condition, variable names)
 */
export type ContextLevel = "L0" | "L1" | "L2" | "L3" | "L4";

/** How the explanation ends: a next step to try, or the fix itself */
export type ExplanationStyle = "nudge" | "fix";

export const CONTEXT_LEVELS: ContextLevel[] = ["L0", "L1", "L2", "L3", "L4"];
export const EXPLANATION_STYLES: ExplanationStyle[] = ["nudge", "fix"];

export type PromptOptions = {
    level: ContextLevel;
    primer: PrimerVariant;
    style: ExplanationStyle;
};

export const DEFAULT_PROMPT_OPTIONS: PromptOptions = { level: "L3", primer: "full", style: "nudge" };

export type ExplanationPrompt = {
    system: string;
    user: string;
};

/** Returns the contents of a file referenced by a diagnostic, or undefined if it cannot be read */
export type FileReader = (file: string) => string | undefined;

const SNIPPET_RADIUS = 15;
const SPEC_RADIUS = 4;

const STYLE_INSTRUCTIONS: Record<ExplanationStyle, { rule: string; format: string }> = {
    nudge: {
        rule: "- Do not give the full fix. Suggest one concrete next step the developer can take to find it.",
        format: "**Try:** <one concrete next step, not the full solution>",
    },
    fix: {
        rule: "- Give the smallest change that fixes the error while keeping the intended behaviour.",
        format: "**Fix:** <the smallest change that fixes the error>",
    },
};

export function buildExplanationPrompt(
    diagnostic: LJDiagnostic,
    readFile: FileReader,
    options: PromptOptions = DEFAULT_PROMPT_OPTIONS
): ExplanationPrompt {
    return {
        system: buildSystemPrompt(options),
        user: buildUserPrompt(diagnostic, readFile, options.level),
    };
}

function buildSystemPrompt(options: PromptOptions): string {
    const style = STYLE_INSTRUCTIONS[options.style];
    const primer = getPrimer(options.primer);
    return [
        "You explain LiquidJava verification errors to Java developers who are new to refinement types and typestates.",
        primer,
        [
            "Rules:",
            "- Do not repeat the error message. Explain what it means in this code.",
            "- Point to the line where the problem originates, which may differ from the reported line.",
            "- Only refer to code and specifications you were given. If you are unsure, say so.",
            "- Use source variable names, not internal verifier names.",
            style.rule,
            "- At most 90 words in total.",
        ].join("\n"),
        [
            "Answer in exactly this format:",
            "**What went wrong:** <1-2 sentences in plain language>",
            "**Where it comes from:** line <N>: <why this line causes the error>",
            style.format,
        ].join("\n"),
    ].filter(Boolean).join("\n\n");
}

function buildUserPrompt(diagnostic: LJDiagnostic, readFile: FileReader, level: ContextLevel): string {
    const sections: string[] = [];
    const line = diagnostic.position ? toLine(diagnostic.position.lineStart) : undefined;
    const location = line !== undefined ? `${getFileName(diagnostic.file)}:${line}` : getFileName(diagnostic.file);

    sections.push(`${diagnostic.title} at ${location}:\n${diagnostic.message}`);
    if ("customMessage" in diagnostic && diagnostic.customMessage?.trim())
        sections.push(`Custom message from the specification: ${diagnostic.customMessage.trim()}`);
    sections.push(`Verifier hint: ${diagnostic.hint?.trim() || "none"}`);

    const source = readFile(diagnostic.file);
    if (level !== "L0" && source !== undefined) {
        const lines = source.split(/\r?\n/);
        const [start, end] = level === "L1" && line !== undefined
            ? [Math.max(1, line - SNIPPET_RADIUS), Math.min(lines.length, line + SNIPPET_RADIUS)]
            : [1, lines.length];
        sections.push(
            `Code (${getFileName(diagnostic.file)}, lines ${start}-${end}, the reported line is marked with >>):\n` +
            numberLines(lines, start, end, line)
        );
    }

    if (level === "L3" || level === "L4") {
        const spec = renderSpecification(diagnostic, readFile);
        if (spec) sections.push(spec);
        if ("stateMachine" in diagnostic && diagnostic.stateMachine)
            sections.push(renderStateMachine(diagnostic.stateMachine));
    }

    if (level === "L4") {
        const internals = renderVerifierInternals(diagnostic);
        if (internals) sections.push(internals);
    }

    return sections.join("\n\n");
}

function renderSpecification(diagnostic: LJDiagnostic, readFile: FileReader): string | undefined {
    if (!("declarationPosition" in diagnostic) || !diagnostic.declarationPosition) return undefined;
    const position = diagnostic.declarationPosition;
    const file = position.file ?? diagnostic.file;
    const source = readFile(file);
    if (source === undefined) return undefined;

    const lines = source.split(/\r?\n/);
    const declared = toLine(position.lineStart);
    const start = Math.max(1, declared - SPEC_RADIUS);
    // extend to the end of the method declaration, which can follow several annotations
    let end = Math.min(lines.length, toLine(position.lineEnd));
    while (end < lines.length && end - declared < SPEC_RADIUS * 2 && !lines[end - 1].includes(";")) end++;
    const header = findRefinementsHeader(lines);
    return `Violated specification (${getFileName(file)}, declared at line ${declared}):\n` +
        (header ? `${header}\n...\n` : "") +
        numberLines(lines, start, end, declared);
}

/** Returns the class-level annotations of a specification file (e.g. @StateSet, @ExternalRefinementsFor) */
function findRefinementsHeader(lines: string[]): string | undefined {
    const header = lines.filter(l => /^\s*@(StateSet|ExternalRefinementsFor|Ghost|RefinementAlias)\b/.test(l));
    return header.length ? header.map(l => l.trim()).join("\n") : undefined;
}

function renderStateMachine(fsm: LJStateMachine): string {
    const out = [`State machine of ${fsm.className}:`, `States: ${fsm.states.join(", ")}`];
    const initial = unique(fsm.initialTransitions.map(t => `${t.to}${t.toCondition ? ` [${t.toCondition}]` : ""}`));
    out.push(`Constructors put the object in: ${initial.join(" or ")}`);

    // group state-changing transitions by method; methods that keep the state are summarised
    const changes = new Map<string, string[]>();
    const keeps = new Map<string, string[]>();
    for (const t of fsm.transitions) {
        const target = t.from === t.to ? keeps : changes;
        const entry = t.from === t.to ? t.from : `${t.from} -> ${t.to}`;
        target.set(t.label, unique([...(target.get(t.label) ?? []), entry]));
    }
    out.push("State-changing methods:");
    for (const [method, moves] of changes) out.push(`  ${method}: ${moves.join(", ")}`);
    if (keeps.size) {
        out.push("Methods that keep the state, and the states they may be called in:");
        for (const [method, states] of keeps) if (!changes.has(method)) out.push(`  ${method}: ${states.join(", ")}`);
    }
    if (fsm.errorContext) {
        const { calledMethod, actualStates } = fsm.errorContext;
        out.push(`At the error, ${calledMethod ?? "the call"} was made while the object was in: ${actualStates.join(", ") || "unknown"}`);
    }
    return out.join("\n");
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function renderVerifierInternals(diagnostic: LJDiagnostic): string | undefined {
    const out: string[] = [];
    if ("expected" in diagnostic && diagnostic.expected) out.push(`Expected: ${diagnostic.expected}`);
    if ("found" in diagnostic && diagnostic.found) out.push(`Known at this point: ${renderSimplification(diagnostic.found)}`);
    if ("counterexample" in diagnostic && diagnostic.counterexample?.assignments.length)
        out.push("Counterexample: " + diagnostic.counterexample.assignments.map(a => `${a.variable} == ${a.value}`).join(" && "));
    if ("translationTable" in diagnostic && diagnostic.translationTable) {
        const names = renderTranslationTable(diagnostic.translationTable);
        if (names) out.push(`Internal names:\n${names}`);
    }
    return out.length ? `Verifier details:\n${out.join("\n")}` : undefined;
}

function renderSimplification(result: VCSimplificationResult): string {
    // the original (unsimplified) condition is the deepest origin
    let original = result;
    while (original.origin) original = original.origin;
    return renderImplication(original.implication);
}

function renderImplication(implication: VCImplication): string {
    const parts: string[] = [];
    for (let node: VCImplication | null = implication; node; node = node.next) {
        const binder = node.name ? `∀${node.name}${node.type ? `:${node.type}` : ""}, ` : "";
        parts.push(`${binder}${node.predicate}`);
    }
    return parts.join(" => ");
}

function renderTranslationTable(table: TranslationTable): string {
    return Object.entries(table)
        .map(([name, placement]) => `  ${name} = \`${placement.text}\`${renderLine(placement.position)}`)
        .join("\n");
}

function renderLine(position: SourcePosition | null): string {
    return position ? ` (line ${toLine(position.lineStart)})` : "";
}

/** Positions from the language server are 0-based; prompts use 1-based line numbers like the editor */
function toLine(zeroBased: number): number {
    return zeroBased + 1;
}

function numberLines(lines: string[], start: number, end: number, marked?: number): string {
    const width = String(end).length;
    const out: string[] = [];
    for (let i = start; i <= end; i++) {
        const prefix = i === marked ? ">>" : "  ";
        out.push(`${prefix}${String(i).padStart(width)} | ${lines[i - 1] ?? ""}`);
    }
    return out.join("\n");
}

function getFileName(file: string): string {
    return file.split(/[\\/]/).pop() ?? file;
}
