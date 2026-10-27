import type { LJStateMachine } from "../types/fsm";

export const VALID_STATE_ICON = '✓';
export const INVALID_STATE_ICON = '✕';

/**
 * The selected state error of a single state machine, split by the possible states of the receiver
 */
export type StateErrorFocus = {
    calledMethod: string | null;
    receiver: string | null;
    // states the receiver may be in at the call
    possibleStates: string[];
    // possible states from which the call is accepted
    validStates: string[];
    // possible states from which the call is rejected
    invalidStates: string[];
    // states from which the call is accepted
    acceptedStates: string[];
    // whether nothing is known about the state of the receiver, so that every state is possible
    unknownState: boolean;
};

/**
 * Gets the state error to focus on from the error context of a state machine
 * @param sm
 * @returns the state error focus, or null when there is no error or the server reports no accepted states
 */
export function getStateErrorFocus(sm: LJStateMachine | undefined): StateErrorFocus | null {
    const context = sm?.errorContext;
    if (!sm || !context || context.acceptedStates.length === 0) return null;

    // marking every state as valid or invalid would only say that the state is unknown
    const unknownState = context.possibleStates.length === sm.states.length;
    return {
        calledMethod: context.calledMethod,
        receiver: context.receiver,
        possibleStates: context.possibleStates,
        validStates: unknownState ? [] : context.validStates,
        invalidStates: unknownState ? [] : context.invalidStates,
        acceptedStates: context.acceptedStates,
        unknownState,
    };
}

/**
 * Gets the states related to a state error: the possible states of the receiver and the accepted states
 * @param focus
 * @returns the related states
 */
export function getRelatedStates(focus: StateErrorFocus): string[] {
    return [...new Set([...focus.possibleStates, ...focus.acceptedStates])];
}

/**
 * Gets the text shown for the rejected call, e.g. root.getFirstChild()
 * @param call the called method and receiver of the state error
 * @returns the call text, or null when the called method is unknown
 */
export function getRejectedCallText(call: Pick<StateErrorFocus, 'calledMethod' | 'receiver'>): string | null {
    if (!call.calledMethod) return null;
    return `${call.receiver ? `${call.receiver}.` : ''}${call.calledMethod}()`;
}

/**
 * Orders the state machines of a class so that those of the state sets with the state error come first
 * @param sms the state machines, one per state set, in declaration order
 * @returns the state machines with the state error, then the others, each in declaration order
 */
export function orderStateMachines(sms: LJStateMachine[]): LJStateMachine[] {
    return [...sms.filter(sm => sm.errorContext), ...sms.filter(sm => !sm.errorContext)];
}

/**
 * Gets the state error to focus on in each state machine that has one
 * @param sms the state machines, one per state set
 * @returns the state error focus of each state set with the error
 */
export function getStateErrorFocuses(sms: LJStateMachine[]): StateErrorFocus[] {
    return sms.map(getStateErrorFocus).filter((focus): focus is StateErrorFocus => !!focus);
}

/**
 * A transition of a way to fix a state error, with every method that makes it
 */
export type StateFixStep = {
    from: string;
    to: string;
    methods: string[];
};

/**
 * A way to bring the receiver from a state that rejects the call to a state that accepts it, read from the diagram
 * The steps are empty when no transition leads from the state to an accepted one
 */
export type StateFix = {
    from: string;
    steps: StateFixStep[];
};

/**
 * Gets, for each possible state that rejects the call, a shortest way along the diagram's transitions to an accepted state
 * The diagram only has the transitions of the specification, so a way may need specific arguments, and other ways may exist
 * @param sm the state machine
 * @param focus the state error on it
 * @returns one fix per invalid state, in the order of the states
 */
export function getStateFixes(sm: LJStateMachine, focus: StateErrorFocus): StateFix[] {
    const methodsByEdge = new Map<string, string[]>();
    sm.transitions.forEach(({ from, to, label }) => {
        if (from === to) return;
        const key = `${from}|${to}`;
        const methods = methodsByEdge.get(key) ?? [];
        if (!methods.includes(label)) methods.push(label);
        methodsByEdge.set(key, methods);
    });
    const edges = [...methodsByEdge].map(([key, methods]) => {
        const [from, to] = key.split('|');
        return { from, to, methods };
    });

    return sm.states.filter(state => focus.invalidStates.includes(state)).map(start => {
        // breadth-first, so the first accepted state reached is one of the closest
        const previous = new Map<string, StateFixStep | null>([[start, null]]);
        const queue = [start];
        while (queue.length > 0) {
            const state = queue.shift()!;
            if (focus.acceptedStates.includes(state)) return { from: start, steps: getStepsTo(state, previous) };
            edges.filter(edge => edge.from === state && !previous.has(edge.to)).forEach(edge => {
                previous.set(edge.to, edge);
                queue.push(edge.to);
            });
        }
        return { from: start, steps: [] };
    });
}

function getStepsTo(state: string, previous: Map<string, StateFixStep | null>): StateFixStep[] {
    const steps: StateFixStep[] = [];
    for (let step = previous.get(state); step; step = previous.get(step.from)) steps.unshift(step);
    return steps;
}

/**
 * Gets the states whose constructors fix a state error, which are the accepted states when an invalid state cannot reach one
 * @param sm the state machine
 * @param focus the state error on it
 * @param fixes the fixes of the state error
 * @returns the accepted states a constructor leads to, or none when every invalid state can reach an accepted one
 */
export function getConstructorFixStates(sm: LJStateMachine, focus: StateErrorFocus, fixes: StateFix[]): string[] {
    if (!fixes.some(fix => fix.steps.length === 0)) return [];
    return [...new Set(sm.initialTransitions.map(transition => transition.to))]
        .filter(state => focus.acceptedStates.includes(state));
}
