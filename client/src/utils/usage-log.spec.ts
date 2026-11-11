import { describe, expect, it } from 'vitest';
import { formatUsageLine, usageEventFor } from './usage-log';

describe('the usage log', () => {
    const now = new Date('2026-11-12T10:00:00.000Z');

    it('turns a usage message into a line with the time, the action as event, and its details', () => {
        expect(usageEventFor({ type: 'usage', action: 'tab', tab: 'fsm' }, now))
            .toEqual({ t: '2026-11-12T10:00:00.000Z', event: 'tab', tab: 'fsm' });
        expect(formatUsageLine(usageEventFor({ type: 'usage', action: 'hints', open: true, error: 'e1' }, now)!))
            .toBe('{"t":"2026-11-12T10:00:00.000Z","event":"hints","open":true,"error":"e1"}\n');
    });

    it('logs a click on a location as location, and nothing for the other messages', () => {
        expect(usageEventFor({ type: 'openFile', filePath: '/w/M.java', line: 12, character: 4 }, now))
            .toEqual({ t: '2026-11-12T10:00:00.000Z', event: 'location', file: '/w/M.java', line: 12, character: 4 });
        expect(usageEventFor({ type: 'ready' }, now)).toBeNull();
        expect(usageEventFor({ type: 'highlight', range: null }, now)).toBeNull();
        expect(usageEventFor({ type: 'usage' }, now)).toBeNull();
    });
});
