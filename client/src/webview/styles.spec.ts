import { afterEach, describe, expect, it } from 'vitest';
import { getStyles } from './styles';

// state markup copied from a Mermaid 11 state diagram rendered in the webview
const state = (className: string) => /*html*/`
    <g class="node ${className} statediagram-state ">
        <rect class="basic label-container"></rect>
        <g class="label"><rect></rect></g>
    </g>`;

function render(nodes: string) {
    document.head.innerHTML = `<style>${getStyles()}</style>`;
    document.body.innerHTML = /*html*/`
        <div class="diagram-container"><div class="mermaid"><svg>${nodes}</svg></div></div>`;
}

function style(selector: string): CSSStyleDeclaration {
    return getComputedStyle(document.querySelector(selector)!);
}

afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
});

describe('state error styles', () => {
    it('outlines the states from which the call is rejected or accepted', () => {
        render(state('ljStateInvalid') + state('ljStateValid'));

        expect(style('.ljStateInvalid .label-container').getPropertyValue('stroke')).toBe('var(--lj-state-invalid)');
        expect(style('.ljStateValid .label-container').getPropertyValue('stroke')).toBe('var(--lj-state-valid)');
        // a faint fill of the outline colour helps to find small marked states in large machines
        expect(style('.ljStateInvalid .label-container').getPropertyValue('fill'))
            .toBe('color-mix(in srgb, var(--lj-state-invalid) 10%, var(--vscode-editor-background))');
    });

    it('hints at the other accepted states with a thin dashed warning outline', () => {
        render(state('ljStateAccepted'));

        const outline = style('.ljStateAccepted .label-container');
        expect(outline.getPropertyValue('stroke')).toBe('var(--lj-state-accepted)');
        expect(outline.getPropertyValue('stroke-width')).toBe('1px');
        expect(outline.getPropertyValue('stroke-dasharray')).toBe('4 3');
        expect(outline.getPropertyValue('fill')).toBe('var(--vscode-editor-background)');
    });

    it('draws the legend swatches like the marked states', () => {
        render('');
        document.body.insertAdjacentHTML('beforeend', ['invalid', 'valid', 'accepted']
            .map(kind => `<span class="diagram-error-legend-swatch diagram-error-legend-${kind}"></span>`).join(''));

        // jsdom does not compute colours given as variables, so read the declared colour
        const declaredColour = (selector: string) => Array.from(document.styleSheets[0].cssRules)
            .map(rule => rule as CSSStyleRule)
            .find(rule => rule.selectorText === selector)?.style.getPropertyValue('border-color');
        const border = (kind: string) => {
            const swatch = style(`.diagram-error-legend-${kind}`);
            return [swatch.getPropertyValue('border-top-width'), swatch.getPropertyValue('border-top-style'),
                declaredColour(`.diagram-error-legend-${kind}`)];
        };
        expect(border('invalid')).toEqual(['2px', 'solid', 'var(--lj-state-invalid)']);
        expect(border('valid')).toEqual(['2px', 'solid', 'var(--lj-state-valid)']);
        expect(border('accepted')).toEqual(['1px', 'dashed', 'var(--lj-state-accepted)']);
    });

    it('clips the panned diagram to its viewport', () => {
        render('');
        document.body.insertAdjacentHTML('beforeend', '<div class="diagram-viewport"></div>');

        expect(style('.diagram-viewport').overflow).toBe('hidden');
    });

    it('dims unrelated states and transitions', () => {
        render(state('ljStateDimmed') + '<path class="transition lj-dimmed"></path><g class="label lj-dimmed"></g>');

        for (const selector of ['.ljStateDimmed', 'path.lj-dimmed', 'g.lj-dimmed']) {
            expect(style(selector).opacity).toBe('0.25');
        }
    });

    it('dims single methods of a label without dimming a dimmed transition twice', () => {
        const label = (className: string, method: string) => `<g class="edgeLabel"><g class="${className}"><foreignObject>`
            + `<div><span class="edgeLabel"><p><span class="lj-dimmed-method">${method}</span></p></span></div></foreignObject></g></g>`;
        render(label('label', 'send') + label('label lj-dimmed', 'bind'));

        const [method, inDimmedTransition] = document.querySelectorAll('.lj-dimmed-method');
        expect(getComputedStyle(method).opacity).toBe('0.25');
        expect(getComputedStyle(inDimmedTransition).opacity).toBe('1');

        // only the background of a fully dimmed label is cleared
        const [bright, dimmed] = document.querySelectorAll('g.label');
        expect(getComputedStyle(bright.querySelector('div')!).getPropertyValue('background')).toBe('var(--vscode-editor-background)');
        for (const part of dimmed.querySelectorAll('div, span, p')) {
            expect(getComputedStyle(part).getPropertyValue('background')).toBe('transparent');
        }
    });

    it('keeps other states with the default outline', () => {
        render(state(''));

        expect(style('.label-container').getPropertyValue('stroke')).toBe('var(--vscode-foreground)');
        expect(style('.statediagram-state').opacity).toBe('1');
    });
});
