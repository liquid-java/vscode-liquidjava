import type { DiagnosticRevealTarget, LJDiagnostic } from "../types/diagnostics";

export function getDiagnosticRevealTargetKey(target: DiagnosticRevealTarget): string {
    const { lineStart, colStart, lineEnd, colEnd } = target.position;
    return `${target.file}:${lineStart}:${colStart}-${lineEnd}:${colEnd}`;
}

export function getDiagnosticRevealTarget(diagnostic: LJDiagnostic): DiagnosticRevealTarget | undefined {
    if (!diagnostic.position) return undefined;
    return {
        file: diagnostic.position.file || diagnostic.file,
        position: diagnostic.position
    };
}

export function getDiagnosticRevealTargetFromKey(value?: string): DiagnosticRevealTarget | undefined {
    const match = value?.match(/^(.*):(\d+):(\d+)-(\d+):(\d+)$/);
    if (!match) return undefined;

    const [, file, lineStart, colStart, lineEnd, colEnd] = match;
    return {
        file,
        position: {
            file,
            lineStart: parseInt(lineStart, 10),
            colStart: parseInt(colStart, 10),
            lineEnd: parseInt(lineEnd, 10),
            colEnd: parseInt(colEnd, 10)
        }
    };
}
