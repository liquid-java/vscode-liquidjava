import type { LJStateMachine } from "../types/fsm";
import { copyToClipboard } from "./clipboard";
import { INVALID_STATE_ICON, VALID_STATE_ICON, getRelatedStates, getStateErrorFocus } from "./diagram-focus";

// constants
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_BUTTON_FACTOR = 1.5;
const SCROLL_ZOOM_IN_FACTOR = 1.05;
const SCROLL_ZOOM_OUT_FACTOR = 0.95;
// Mermaid comment listing the transitions to dim once rendered, which leaves the layout unchanged
const DIMMED_TRANSITIONS_COMMENT = '%% lj-dimmed-transitions:';

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
 * @param focusOnError whether to dim the states and transitions unrelated to the selected state error
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
    sm.initialTransitions.forEach(transition => {
        const label = getInitialTransitionLabel(transition.constructorSignature, transition.toCondition, showConditions);
        addTransition(`    [*] --> ${transition.to}${label ? ` : ${label}` : ''}`, relatedStates.length > 0);
    });

    // entry transitions of objects in an unknown state, also from the initial pseudo state and dimmed in focus mode
    sm.entryTransitions?.forEach(transition => {
        const label = getTransitionLabel(transition.label, null, transition.toCondition, showConditions);
        addTransition(`    [*] --> ${transition.to} : ${label}`, relatedStates.length > 0);
    });
    
    // in focus mode, only the failed method and the ways out of the possible states stay bright
    const isUsefulTransition = (from: string, to: string) => !!errorFocus?.possibleStates.includes(from) && from !== to;

    // group transitions by from/to states and merge labels
    const transitionMap = new Map<string, { labels: string[], dimmed: boolean }>();
    sm.transitions.forEach(transition => {
        const isCalledMethod = transition.label === sm.errorContext?.calledMethod;
        const dimmed = relatedStates.length > 0 && !isCalledMethod && !isUsefulTransition(transition.from, transition.to);
        const label = getTransitionLabel(
            transition.label,
            transition.fromCondition,
            transition.toCondition,
            showConditions,
            isCalledMethod,
        );
        const key = `${transition.from}|${transition.to}`;
        if (!transitionMap.has(key)) transitionMap.set(key, { labels: [], dimmed: true });
        const group = transitionMap.get(key)!;
        // wrapping the label keeps its text, so the layout stays the same
        group.labels.push(dimmed ? `<span class="lj-dimmed-method">${label}</span>` : label);
        group.dimmed &&= dimmed;
    });

    // add transitions, dimming those whose methods are all dimmed
    transitionMap.forEach(({ labels, dimmed }, key) => {
        const [from, to] = key.split('|');
        addTransition(`    ${from} --> ${to} : ${labels.join('<br/>')}`, dimmed);
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
        const dimmedTransitions = Array.from(mermaidElements, (element: any) => getDimmedTransitions(element.textContent));
        await mermaid.run({ nodes: mermaidElements });
        highlightErrorTransitions(document);
        mermaidElements.forEach((element: any, index: number) => dimTransitions(element, dimmedTransitions[index]));
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

function getDimmedTransitions(diagram: string | null): string[] {
    const comment = diagram?.split('\n').find(line => line.startsWith(DIMMED_TRANSITIONS_COMMENT));
    return comment?.slice(DIMMED_TRANSITIONS_COMMENT.length).trim().split(/\s+/) ?? [];
}

function dimTransitions(element: any, edgeIds: string[]) {
    edgeIds.forEach(edgeId => {
        element.querySelectorAll(`path.transition[data-id="${edgeId}"], g.label[data-id="${edgeId}"]`)
            .forEach((part: any) => part.classList.add('lj-dimmed'));
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
        // keep the error summary text selectable
        if (target.closest?.('.diagram-error-summary')) return;
        
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
