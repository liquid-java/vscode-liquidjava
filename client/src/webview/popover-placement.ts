export type Box = { left: number; top: number; right: number; bottom: number };
export type Point = { x: number; y: number };

// covering a point of a transition's line costs as much as covering this many square pixels of a state or label
const LINE_POINT_COST = 60;
// moving the popover one pixel further from its label costs as much as covering this many square pixels
const DISTANCE_COST = 2;

/**
 * Places a popover next to its anchor where it covers the least of the diagram
 * It tries the right, left, top, and bottom of the anchor, then beside the diagram at the anchor's height,
 * keeps each inside the window, and picks the one that covers the fewest states, labels, and transition lines,
 * the closest one on a tie
 * @param anchor the box of the label the popover lists the methods of
 * @param size the size of the popover
 * @param bounds the box the popover must stay in, usually the window less a margin
 * @param diagram the box of the diagram, to place the popover beside it
 * @param boxes the boxes of the states and labels the popover should not cover
 * @param points points along the transition lines the popover should not cover
 * @param gap the space between the popover and its anchor or the diagram
 * @returns the top-left corner of the popover
 */
export function placePopover(
    anchor: Box,
    size: { width: number; height: number },
    bounds: Box,
    diagram: Box,
    boxes: Box[],
    points: Point[],
    gap: number,
): Point {
    const { width, height } = size;
    const middle = (anchor.top + anchor.bottom - height) / 2;
    const center = (anchor.left + anchor.right - width) / 2;
    const candidates: Point[] = [
        { x: anchor.right + gap, y: middle },
        { x: anchor.left - gap - width, y: middle },
        { x: center, y: anchor.top - gap - height },
        { x: center, y: anchor.bottom + gap },
        { x: diagram.right + gap, y: middle },
        { x: diagram.left - gap - width, y: middle },
    ].map(({ x, y }) => ({
        x: clamp(x, bounds.left, bounds.right - width),
        y: clamp(y, bounds.top, bounds.bottom - height),
    }));

    const cost = ({ x, y }: Point) => {
        const box = { left: x, top: y, right: x + width, bottom: y + height };
        const covered = boxes.reduce((sum, other) => sum + overlap(box, other), 0)
            + overlap(box, anchor) * 10
            + points.filter(point => contains(box, point)).length * LINE_POINT_COST;
        return covered + distance(box, anchor) * DISTANCE_COST;
    };
    return candidates.reduce((best, candidate) => cost(candidate) < cost(best) ? candidate : best);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

function overlap(a: Box, b: Box): number {
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return width > 0 && height > 0 ? width * height : 0;
}

function contains(box: Box, { x, y }: Point): boolean {
    return x > box.left && x < box.right && y > box.top && y < box.bottom;
}

// the gap between two boxes, 0 when they touch or overlap
function distance(a: Box, b: Box): number {
    const dx = Math.max(b.left - a.right, a.left - b.right, 0);
    const dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0);
    return Math.hypot(dx, dy);
}
