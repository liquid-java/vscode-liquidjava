import { describe, expect, it } from 'vitest';
import { formatHintsMarkdown } from './message-markdown';

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
