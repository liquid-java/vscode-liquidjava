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
    const acceptedStates = sm?.states.filter(state => context?.expectedStates?.includes(state)) ?? [];
    if (!sm || !context || acceptedStates.length === 0) return null;

    const possible = context.possibleStates?.length
        ? context.possibleStates
        : context.definiteFoundState ? [context.definiteFoundState] : context.actualStates;
    const possibleStates = sm.states.filter(state => possible.includes(state));
    // marking every state as valid or invalid would only say that the state is unknown
    const unknownState = possibleStates.length === sm.states.length;
    const markedStates = unknownState ? [] : possibleStates;
    return {
        calledMethod: context.calledMethod,
        receiver: context.receiver ?? null,
        possibleStates,
        validStates: markedStates.filter(state => acceptedStates.includes(state)),
        invalidStates: markedStates.filter(state => !acceptedStates.includes(state)),
        acceptedStates,
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
 * @param focus
 * @returns the call text, or null when the called method is unknown
 */
export function getRejectedCallText(focus: StateErrorFocus): string | null {
    if (!focus.calledMethod) return null;
    return `${focus.receiver ? `${focus.receiver}.` : ''}${focus.calledMethod}()`;
}
