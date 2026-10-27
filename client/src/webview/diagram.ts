import type { LJStateMachine } from "../types/fsm";
import { copyToClipboard } from "./clipboard";
import { INVALID_STATE_ICON, VALID_STATE_ICON, getRelatedStates, getStateErrorFocus } from "./diagram-focus";
import { placePopover, type Box, type Point } from "./popover-placement";

// constants
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_BUTTON_FACTOR = 1.5;
const SCROLL_ZOOM_IN_FACTOR = 1.05;
const SCROLL_ZOOM_OUT_FACTOR = 0.95;
// Mermaid comment listing the transitions to dim once rendered
const DIMMED_TRANSITIONS_COMMENT = '%% lj-dimmed-transitions:';
// a focused diagram is shrunk to fit the panel, but never below this scale so that its labels stay readable
const MIN_FOCUS_SCALE = 0.6;
const FOCUS_BOTTOM_MARGIN = 16;
// the list of a collapsed label's methods keeps this distance from the label and from the window's edges
const POPOVER_GAP = 6;
const POPOVER_MARGIN = 8;
// the step between the points of a transition line the list avoids
const LINE_SAMPLE_STEP = 8;

// state variables
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

/**
 * Converts a StateMachine object to a Mermaid state diagram string
 * @param sm 
 * @param orientation
 * @param showConditions
 * @param focusOnError whether to dim the states unrelated to the selected state error and collapse the unrelated methods
 * @returns Mermaid diagram string
 */
export function createMermaidDiagram(
    sm: LJStateMachine | undefined,
    orientation: "LR" | "TB",
    showConditions = false,
    focusOnError = false,
): string {
    if (!sm) return '';
    
    const lines: string[] = [];
    const errorFocus = getStateErrorFocus(sm);
    const relatedStates = focusOnError && errorFocus ? getRelatedStates(errorFocus) : [];
    const isDimmed = (state: string) => relatedStates.length > 0 && !relatedStates.includes(state);
    // focusing collapses the dimmed methods of each label, so the diagram is laid out again around the error
    const collapse = relatedStates.length > 0;
    // Mermaid numbers the rendered transitions in the order they are declared
    const dimmedTransitions: string[] = [];
    let transitionCount = 0;
    const addTransition = (line: string, dimmed: boolean) => {
        if (dimmed) dimmedTransitions.push(`edge${transitionCount}`);
        transitionCount++;
        lines.push(line);
    };

    lines.push('stateDiagram-v2');
    lines.push(`    direction ${orientation}`);
    
    // initial transitions, dimmed in focus mode since the receiver already exists at the call
    if (collapse) {
        const targets = [...new Set(sm.initialTransitions.map(transition => transition.to))];
        targets.forEach(to => {
            const signatures = sm.initialTransitions.filter(transition => transition.to === to)
                .map(transition => transition.constructorSignature ? escapeMermaidLabel(transition.constructorSignature) : '')
                .filter(Boolean);
            const label = getCollapsedLabel([], signatures.map(signature => ({ name: signature, label: signature })), 'constructors');
            addTransition(`    [*] --> ${to}${label ? ` : ${label}` : ''}`, true);
        });
    } else {
        sm.initialTransitions.forEach(transition => {
            const label = getInitialTransitionLabel(transition.constructorSignature, transition.toCondition, showConditions);
            addTransition(`    [*] --> ${transition.to}${label ? ` : ${label}` : ''}`, false);
        });
    }

    // entry transitions of objects in an unknown state, also from the initial pseudo state,
    // dimmed and collapsed in focus mode like the constructors
    const entryTransitions = sm.entryTransitions ?? [];
    if (collapse) {
        [...new Set(entryTransitions.map(transition => transition.to))].forEach(to => {
            const methods: CollapsibleLabel[] = [];
            entryTransitions.filter(transition => transition.to === to).forEach(transition => {
                const name = escapeMermaidLabel(transition.label);
                const label = getTransitionLabel(transition.label, null, transition.toCondition, showConditions);
                if (!methods.some(method => method.name === name)) methods.push({ name, label });
            });
            addTransition(`    [*] --> ${to} : ${getCollapsedLabel([], methods, 'methods')}`, true);
        });
    } else {
        entryTransitions.forEach(transition => {
            const label = getTransitionLabel(transition.label, null, transition.toCondition, showConditions);
            addTransition(`    [*] --> ${transition.to} : ${label}`, false);
        });
    }

    // group transitions by from/to states and merge labels
    const transitionMap = new Map<string, { bright: string[], dimmed: CollapsibleLabel[] }>();
    sm.transitions.forEach(transition => {
        const key = `${transition.from}|${transition.to}`;
        const isCalledMethod = transition.label === sm.errorContext?.calledMethod;
        // in focus mode, only the failed method stays bright
        const dimmed = collapse && !isCalledMethod;
        const label = getTransitionLabel(
            transition.label,
            transition.fromCondition,
            transition.toCondition,
            showConditions,
            isCalledMethod,
        );
        if (!transitionMap.has(key)) transitionMap.set(key, { bright: [], dimmed: [] });
        const group = transitionMap.get(key)!;
        const name = escapeMermaidLabel(transition.label);
        // overloads share a name, so it is counted once
        if (!dimmed) group.bright.push(label);
        else if (!group.dimmed.some(method => method.name === name)) group.dimmed.push({ name, label });
    });

    // add transitions, dimming those whose methods are all dimmed
    transitionMap.forEach(({ bright, dimmed }, key) => {
        const [from, to] = key.split('|');
        addTransition(`    ${from} --> ${to} : ${getCollapsedLabel(bright, dimmed, 'methods')}`, bright.length === 0);
    });

    if (!errorFocus) {
        const highlightedStates = sm.errorContext?.possibleStates ?? [];
        if (highlightedStates.length > 0) {
            lines.push(`    class ${highlightedStates.join(',')} ljStateErrorActual`);
        }
        return lines.join('\n');
    }

    // mark the possible states from which the call is accepted or rejected, with text besides colour,
    // and hint at the other states that accept the call
    errorFocus.validStates.forEach(state => lines.push(`    state "${VALID_STATE_ICON} ${state}" as ${state}`));
    errorFocus.invalidStates.forEach(state => lines.push(`    state "${INVALID_STATE_ICON} ${state}" as ${state}`));
    const stateClasses: [string[], string][] = [
        [errorFocus.validStates, 'ljStateValid'],
        [errorFocus.invalidStates, 'ljStateInvalid'],
        [errorFocus.acceptedStates.filter(state => !errorFocus.validStates.includes(state)), 'ljStateAccepted'],
        [sm.states.filter(isDimmed), 'ljStateDimmed'],
    ];
    stateClasses.forEach(([states, className]) => {
        if (states.length > 0) lines.push(`    class ${states.join(',')} ${className}`);
    });
    if (dimmedTransitions.length > 0) lines.push(`${DIMMED_TRANSITIONS_COMMENT} ${dimmedTransitions.join(' ')}`);

    return lines.join('\n');
}

// a method of a transition label that focus mode may collapse, by its name and its full label
type CollapsibleLabel = { name: string; label: string };

/**
 * Gets the label of a transition whose dimmed methods are collapsed into a count
 * A single dimmed method keeps its full label, since the count would be no shorter
 * The full labels are kept hidden in the count, for the list shown on hover
 */
function getCollapsedLabel(bright: string[], dimmed: CollapsibleLabel[], noun: 'methods' | 'constructors'): string {
    if (dimmed.length === 0) return bright.join('<br/>');
    if (dimmed.length === 1) return [...bright, `<span class="lj-dimmed-method">${dimmed[0].label}</span>`].join('<br/>');
    const count = bright.length > 0 ? `+${dimmed.length} more` : `${dimmed.length} ${noun}`;
    const methods = `<span class="lj-collapsed-list">${dimmed.map(method => `<span class="lj-collapsed-item">${method.label}</span>`).join('')}</span>`;
    return [...bright, `<span class="lj-dimmed-method lj-collapsed-methods">${count}${methods}</span>`].join('<br/>');
}

function getTransitionLabel(
    label: string,
    fromCondition?: string | null,
    toCondition?: string | null,
    showConditions = false,
    isCalledMethod = false,
): string {
    const escapedLabel = escapeMermaidLabel(label);
    const methodLabel = isCalledMethod
        ? `<span class="lj-state-error-method">${escapedLabel}</span>`
        : escapedLabel;
    if (!showConditions) return methodLabel;
    return [
        getConditionLabel('pre', fromCondition),
        methodLabel,
        getConditionLabel('post', toCondition)
    ].filter(Boolean).join('<br/>');
}

function getInitialTransitionLabel(constructorSignature?: string | null, toCondition?: string | null,
    showConditions = false): string {
    return [
        constructorSignature ? escapeMermaidLabel(constructorSignature) : '',
        showConditions ? getConditionLabel('post', toCondition) : '',
    ].filter(Boolean).join('<br/>');
}

function getConditionLabel(kind: 'pre' | 'post', cond?: string | null): string {
    if (!cond) return '';
    
    return `<span class="state-cond state-cond-${kind}">${escapeMermaidLabel(cond)}</span>`;
}

function escapeMermaidLabel(label: string): string {
    return label.replace(/&/g, '&amp;').replace(/"/g, '\\"').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders Mermaid diagrams in the document
 * @param document The document object
 * @param window The window object
 */
export async function renderMermaidDiagram(document: any, window: any) {
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    const mermaidElements = document.querySelectorAll('.mermaid');
    if (mermaidElements.length === 0) return;

    try { 
        const dimmedTransitions = Array.from(mermaidElements, (element: any) => getListedTransitions(element.textContent, DIMMED_TRANSITIONS_COMMENT));
        await mermaid.run({ nodes: mermaidElements });
        highlightErrorTransitions(document);
        mermaidElements.forEach((element: any, index: number) => {
            markTransitions(element, dimmedTransitions[index], 'lj-dimmed');
        });
        fitFocusedDiagrams(document, window);
        registerCollapsedLabels(document);
        applyTransform(document);
        registerPanListeners(document);
        const diagramContainer = document.querySelector('.diagram-container') as HTMLElement | null;
        if (diagramContainer) diagramContainer.style.minHeight = '';
    } catch (e) {
        console.error('Failed to render Mermaid diagram:', e);
    }
}

function highlightErrorTransitions(document: any) {
    document.querySelectorAll('.lj-state-error-method').forEach((methodLabel: any) => {
        const label = methodLabel.closest('g.label[data-id]');
        const edgeId = label?.getAttribute('data-id');
        const svg = label?.ownerSVGElement;
        if (!edgeId || !svg) return;

        const transition = svg.querySelector(`path.transition[data-id="${edgeId}"]`);
        if (!transition || transition.classList.contains('lj-state-error-transition')) return;
        transition.classList.add('lj-state-error-transition');
        highlightTransitionMarker(svg, transition, edgeId);
    });
}

function getListedTransitions(diagram: string | null, prefix: string): string[] {
    const comment = diagram?.split('\n').find(line => line.startsWith(prefix));
    return comment?.slice(prefix.length).trim().split(/\s+/) ?? [];
}

function markTransitions(element: any, edgeIds: string[], className: string) {
    edgeIds.forEach(edgeId => {
        element.querySelectorAll(`path.transition[data-id="${edgeId}"], g.label[data-id="${edgeId}"]`)
            .forEach((part: any) => part.classList.add(className));
    });
}

// shrinks the focused diagrams with a state error so that they fit below the summary, keeping them readable
function fitFocusedDiagrams(document: any, window: any) {
    const viewport = document.querySelector('.diagram-viewport.diagram-focused') as HTMLElement | null;
    if (!viewport) return;
    const available = window.innerHeight - viewport.getBoundingClientRect().top - FOCUS_BOTTOM_MARGIN;
    viewport.querySelectorAll('.mermaid svg').forEach((svg: any) => {
        if (!svg.querySelector('.ljStateInvalid, .ljStateValid, .ljStateAccepted')) return;
        const height = svg.clientHeight;
        if (!height || height <= available) return;
        svg.style.maxHeight = `${Math.max(available, height * MIN_FOCUS_SCALE)}px`;
    });
}

/**
 * Shows the methods of a collapsed label in a list next to it, without laying out the diagram again
 * Hovering shows the list, and a click pins it until the next click, a pan, or a zoom
 */
function registerCollapsedLabels(document: any) {
    const container = document.querySelector('.diagram-container') as HTMLElement | null;
    if (!container) return;
    let popover: HTMLElement | null = null;
    let pinned: Element | null = null;

    const hide = () => {
        popover?.remove();
        popover = null;
        pinned = null;
    };
    const show = (label: Element) => {
        popover?.remove();
        popover = document.createElement('div') as HTMLElement;
        popover.className = 'lj-methods-popover';
        popover.innerHTML = label.querySelector('.lj-collapsed-list')?.innerHTML ?? '';
        container.appendChild(popover);
        placeMethodsPopover(document, popover, label);
    };

    container.querySelectorAll('.lj-collapsed-methods').forEach(label => {
        label.addEventListener('mouseenter', () => {
            if (!pinned) show(label);
        });
        label.addEventListener('mouseleave', () => {
            if (!pinned) hide();
        });
        label.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            if (pinned === label) return hide();
            show(label);
            pinned = label;
        });
    });
    // the list would no longer be next to its label
    container.addEventListener('mousedown', (e: Event) => {
        if (!(e.target as Element).closest?.('.lj-collapsed-methods, .lj-methods-popover')) hide();
    });
    container.addEventListener('wheel', hide);
}

// places the list of a collapsed label's methods where it covers the least of the label's diagram
function placeMethodsPopover(document: any, popover: HTMLElement, label: Element) {
    // the visible area, without the scrollbars
    const page = document.documentElement;
    const bounds = {
        left: POPOVER_MARGIN,
        top: POPOVER_MARGIN,
        right: page.clientWidth - POPOVER_MARGIN,
        bottom: page.clientHeight - POPOVER_MARGIN,
    };
    popover.style.maxHeight = `${Math.max(bounds.bottom - bounds.top, 0)}px`;
    const svg = label.closest('svg');
    const anchor = toBox(label.getBoundingClientRect());
    const boxes = svg ? Array.from(svg.querySelectorAll('g.node, .edgeLabel'), (element: Element) => toBox(element.getBoundingClientRect())) : [];
    const position = placePopover(
        anchor,
        { width: popover.offsetWidth, height: popover.offsetHeight },
        bounds,
        svg ? toBox(svg.getBoundingClientRect()) : anchor,
        boxes,
        svg ? getLinePoints(svg) : [],
        POPOVER_GAP,
    );
    popover.style.left = `${position.x}px`;
    popover.style.top = `${position.y}px`;
    // the webview may offset fixed elements, so the popover is moved by what it missed
    const placed = popover.getBoundingClientRect();
    popover.style.left = `${2 * position.x - placed.left}px`;
    popover.style.top = `${2 * position.y - placed.top}px`;
}

function toBox(rect: DOMRect): Box {
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

// points along the transition lines of a diagram, in window coordinates
function getLinePoints(svg: Element): Point[] {
    return Array.from(svg.querySelectorAll('path.transition')).flatMap((path: any) => {
        const matrix = path.getScreenCTM?.();
        if (!matrix || typeof path.getTotalLength !== 'function') return [];
        const length = path.getTotalLength();
        const points: Point[] = [];
        for (let at = 0; at <= length; at += LINE_SAMPLE_STEP) {
            const { x, y } = path.getPointAtLength(at).matrixTransform(matrix);
            points.push({ x, y });
        }
        return points;
    });
}

function highlightTransitionMarker(svg: any, transition: any, edgeId: string) {
    const markerReference = transition.getAttribute('marker-end');
    const markerId = markerReference?.match(/^url\(#(.+)\)$/)?.[1];
    if (!markerId) return;

    const marker = svg.querySelector(`#${markerId}`);
    if (!marker?.parentNode) return;

    const highlightedMarker = marker.cloneNode(true);
    const highlightedMarkerId = `${markerId}-lj-error-${edgeId}`;
    highlightedMarker.setAttribute('id', highlightedMarkerId);
    highlightedMarker.classList.add('lj-state-error-marker');
    marker.parentNode.appendChild(highlightedMarker);
    transition.setAttribute('marker-end', `url(#${highlightedMarkerId})`);
}

/**
 * Resets zoom and pan to default values
 * @param document The document object
 */
export function zoomIn(document: any) {
    const container = document.querySelector('.diagram-container') as any;
    if (!container) return;

    // get positions
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const beforeX = (centerX - panX) / zoomLevel;
    const beforeY = (centerY - panY) / zoomLevel;
    
    // apply zoom
    const newZoom = Math.min(zoomLevel * ZOOM_BUTTON_FACTOR, MAX_ZOOM);
    panX = centerX - beforeX * newZoom;
    panY = centerY - beforeY * newZoom;
    zoomLevel = newZoom;
    applyTransform(document);
}

/**
 * Zooms out the diagram
 * @param document The document object
 */
export function zoomOut(document: any) {
    const container = document.querySelector('.diagram-container') as any;
    if (!container) return;

    // get positions
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const beforeX = (centerX - panX) / zoomLevel;
    const beforeY = (centerY - panY) / zoomLevel;
    
    // apply zoom
    const newZoom = Math.max(zoomLevel / ZOOM_BUTTON_FACTOR, MIN_ZOOM);
    panX = centerX - beforeX * newZoom;
    panY = centerY - beforeY * newZoom;
    zoomLevel = newZoom;
    applyTransform(document);
}

/**
 * Resets zoom and pan to default values
 * @param document The document object
 */ 
export function resetZoom(document: any) {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyTransform(document);
}

/**
 * Applies the current zoom and pan transform to the diagram
 * @param document The document object
 */
export function applyTransform(document: any) {
    const wrapper = document.getElementById('diagram-wrapper');
    if (!wrapper) return;
    wrapper.style.transform = `matrix(${zoomLevel}, 0, 0, ${zoomLevel}, ${panX}, ${panY})`;
    
}

/**
 * Sets up pan event listeners to move in the diagram
 * @param document The document object
 */
export function registerPanListeners(document: any) {
    const container = document.querySelector('.diagram-container') as any;
    if (!container) return;

    const onMouseDown = (e: any) => {
        const target = e.target as any;
        if (target.tagName === 'A' || target.tagName === 'BUTTON') return;
        // keep the error summary and the ways to fix it selectable, and the collapsed labels clickable
        if (target.closest?.('.diagram-error-summary, .diagram-fixes, .lj-collapsed-methods, .lj-methods-popover')) return;
        
        e.preventDefault();
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        container.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: any) => {
        if (!isPanning) return;
        e.preventDefault();
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyTransform(document);
    };

    const onMouseUp = () => {
        if (!isPanning) return;
        isPanning = false;
        container.style.cursor = 'grab';
    };

    const onMouseLeave = () => {
       if (!isPanning) return;
        isPanning = false;
        container.style.cursor = 'grab';
    };

    const onWheel = (e: any) => {
        e.preventDefault();

        // get positions
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const beforeX = (mouseX - panX) / zoomLevel;
        const beforeY = (mouseY - panY) / zoomLevel;
        
        // apply zoom
        const delta = e.deltaY > 0 ? SCROLL_ZOOM_OUT_FACTOR : SCROLL_ZOOM_IN_FACTOR;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * delta));
        panX = mouseX - beforeX * newZoom;
        panY = mouseY - beforeY * newZoom;
        zoomLevel = newZoom;
        applyTransform(document);
    };

    // add event listeners
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
}

export async function copyDiagramToClipboard(target: any, diagram: string) {
    await copyToClipboard(target, diagram);
}
