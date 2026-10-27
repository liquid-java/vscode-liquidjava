import { describe, expect, it } from 'vitest';
import { placePopover, type Box } from './popover-placement';

const box = (left: number, top: number, width: number, height: number): Box => ({ left, top, right: left + width, bottom: top + height });
const window = box(0, 0, 1000, 800);
const diagram = box(200, 100, 400, 500);
// a 40 x 20 label in the middle of the diagram
const anchor = box(380, 300, 40, 20);
const size = { width: 100, height: 60 };
const place = (boxes: Box[], points: { x: number; y: number }[] = [], bounds = window) =>
    placePopover(anchor, size, bounds, diagram, boxes, points, 6);

describe('popover placement', () => {
    it('places the popover right of its label when nothing is there', () => {
        expect(place([])).toEqual({ x: 426, y: 280 });
    });

    it('moves left of the label when a state is right of it', () => {
        expect(place([box(430, 270, 120, 80)])).toEqual({ x: 274, y: 280 });
    });

    it('avoids the transition lines', () => {
        // a vertical line right of the label, and one left of it
        const line = (x: number) => Array.from({ length: 20 }, (_, i) => ({ x, y: 250 + i * 8 }));
        expect(place([], [...line(470), ...line(330)])).toEqual({ x: 350, y: 234 });
    });

    it('goes beside the diagram when the label is surrounded', () => {
        const around = [box(426, 250, 120, 120), box(254, 250, 120, 120), box(300, 200, 200, 94), box(300, 326, 200, 100)];
        expect(place(around)).toEqual({ x: 606, y: 280 });
    });

    it('stays inside its bounds, off its label', () => {
        // no room right of the label
        expect(place([], [], box(0, 0, 450, 800))).toEqual({ x: 274, y: 280 });
        // no room either side, so it is pushed against the edge
        expect(place([], [], box(0, 0, 300, 800)).x).toBe(200);
    });
});
