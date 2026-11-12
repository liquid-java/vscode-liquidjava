import { describe, expect, it } from 'vitest';
import { formatDiagnosticMarkdown, formatHintsMarkdown } from './message-markdown';

describe('hints in markdown', () => {
    it('keeps the code and links the lines, and escapes the rest', () => {
        const hint = '`preview.setTilingMode(int mode)` on line 51 decides the state of `preview`: with `mode == 2`, this call would be allowed';
        const position = { file: '/workspace/Stage.java', lineStart: 50, colStart: 8, lineEnd: 50, colEnd: 8 };
        const markdown = formatHintsMarkdown([
            { kind: 'deciding-argument', message: hint },
            { kind: 'general', message: "Call `` b.f('`') `` or `` `q `` when a*b < c_d | #e" },
        ], [{ message: hint, text: 'line 51', start: 37, position }], p => `file://${p.file}#L${p.lineStart + 1}`);

        expect(markdown).toBe([
            '**Hints**',
            '`preview.setTilingMode(int mode)` on [line 51](file:///workspace/Stage.java#L51) decides the state of `preview`\\: with `mode == 2`\\, this call would be allowed',
            "Call ``b.f('`')`` or `` `q `` when a\\*b \\< c\\_d \\| \\#e",
        ].join('\n\n'));
    });

    it('lists several call sequences as options', () => {
        const markdown = formatHintsMarkdown([
            { kind: 'call-sequence', message: 'Call `host.dispose()` before this call' },
            { kind: 'call-sequence', message: 'Call `host.removeNotify()` before this call' },
        ], [], () => null);

        expect(markdown).toBe('**Hints**\n\nAny one of these:\n\n- Call `host.dispose()` before this call\n- Call `host.removeNotify()` before this call');
    });
});

describe('a diagnostic in markdown', () => {
    it('shows the notes, then the counterexample, then the hints, and not the headline, which VS Code shows', () => {
        const note = 'Origin: line 134, `new BufferedInputStream(stream)` makes `markState(buffered) == unmarked`';
        const position = { file: '/workspace/M.java', lineStart: 133, colStart: 43, lineEnd: 133, colEnd: 43 };
        const diagnostic = {
            category: 'error', type: 'refinement-error', title: 'Refinement Error', message: 'found `x` but expected `y`',
            hints: [{ kind: 'general', message: 'Call `buffered.mark(int)` before this call' }],
            file: '/workspace/M.java', position, messageNotes: [note],
            references: [{ message: note, text: 'line 134', start: 8, position }],
            expected: 'y', found: null, customMessage: '', declarationPosition: null, declarationPositions: [], declarationNotes: [],
            counterexample: { assignments: [{ variable: 'x', value: '0' }, { variable: 'size(s)', value: '2' }] },
        } as unknown as import('../types/diagnostics').LJDiagnostic;
        expect(formatDiagnosticMarkdown(diagnostic, p => `file://${p.file}#L${p.lineStart + 1}`)).toBe([
            'Origin\\: [line 134](file:///workspace/M.java#L134)\\, `new BufferedInputStream(stream)` makes `markState(buffered) == unmarked`',
            'Counterexample: `x == 0 && size(s) == 2`',
            '**Hint**\n\nCall `buffered.mark(int)` before this call',
        ].join('\n\n'));
    });

    it('is null when the diagnostic has no notes, counterexample or hints', () => {
        const diagnostic = { category: 'error', type: 'custom-error', title: 'Error', message: 'a < b', hints: [], file: '', position: null, messageNotes: [], references: [] } as unknown as import('../types/diagnostics').LJDiagnostic;
        expect(formatDiagnosticMarkdown(diagnostic, () => null)).toBeNull();
    });
});
