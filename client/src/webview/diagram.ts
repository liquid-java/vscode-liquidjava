import type { LJStateMachine } from "../types/fsm";
import { copyToClipboard } from "./clipboard";

// constants
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_BUTTON_FACTOR = 1.5;
const SCROLL_ZOOM_IN_FACTOR = 1.05;
const SCROLL_ZOOM_OUT_FACTOR = 0.95;

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
 * @returns Mermaid diagram string
 */
export function createMermaidDiagram(
    sm: LJStateMachine | undefined,
    orientation: "LR" | "TB",
    showConditions = false,
): string {
    if (!sm) return '';
    
    const lines: string[] = [];

    // header
    lines.push('---');
    lines.push(`title: ${sm.className}`);
    lines.push('---');
    lines.push('stateDiagram-v2');
    lines.push(`    direction ${orientation}`);
    
    // initial transitions
    sm.initialTransitions.forEach(transition => {
        const label = getInitialTransitionLabel(transition.postCond, showConditions);
        lines.push(`    [*] --> ${transition.to}${label ? ` : ${label}` : ''}`);
    });
    
    // group transitions by from/to states and merge labels
    const transitionMap = new Map<string, string[]>();
    const expectedStates = new Set(sm.errorContext?.expectedStates ?? []);
    sm.transitions.forEach(transition => {
        const isFailedMethod = transition.label === sm.errorContext?.calledMethod && expectedStates.has(transition.from);
        const label = getTransitionLabel(
            transition.label,
            transition.preCond,
            transition.postCond,
            showConditions,
            isFailedMethod,
        );
        const key = `${transition.from}|${transition.to}`;
        if (!transitionMap.has(key)) transitionMap.set(key, []);
        transitionMap.get(key)?.push(label);
    });

    // add transitions
    transitionMap.forEach((labels, key) => {
        const [from, to] = key.split('|');
        const mergedLabel = labels.join('<br/>');
        lines.push(`    ${from} --> ${to} : ${mergedLabel}`);
    });

    const highlightedStates = sm.states.filter(state => sm.errorContext?.actualStates.includes(state));
    if (highlightedStates.length > 0) {
        lines.push(`    class ${highlightedStates.join(',')} ljStateErrorActual`);
    }

    const highlightedExpectedStates = sm.states.filter(state => expectedStates.has(state));
    if (highlightedExpectedStates.length > 0) {
        lines.push(`    class ${highlightedExpectedStates.join(',')} ljStateErrorExpected`);
    }
    
    return lines.join('\n');
}

function getTransitionLabel(
    label: string,
    preCond?: string | null,
    postCond?: string | null,
    showConditions = false,
    isFailedMethod = false,
): string {
    const escapedLabel = escapeMermaidLabel(label);
    const methodLabel = isFailedMethod
        ? `<span class="lj-state-error-method">${escapedLabel}</span>`
        : escapedLabel;
    if (!showConditions) return methodLabel;
    return [
        getConditionLabel('pre', preCond),
        methodLabel,
        getConditionLabel('post', postCond)
    ].filter(Boolean).join('<br/>');
}

function getInitialTransitionLabel(postCond?: string | null, showConditions = false): string {
    return showConditions ? getConditionLabel('post', postCond) : '';
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
        await mermaid.run({ nodes: mermaidElements });
        highlightErrorTransitions(document);
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
