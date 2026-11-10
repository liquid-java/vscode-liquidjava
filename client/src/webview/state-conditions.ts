import type { LJStateMachine } from "../types/fsm";

/**
 * A condition of a transition on the state of a state set, as the states it allows
 */
export type StateCondition = {
    stateSet: LJStateMachine;
    states: string[];
};

// lockState(this) == unlocked, lockState(this) != locked
const STATE_SET_FIRST = /^(\w+)\(this\)\s*(==|!=)\s*(\w+)$/;
// unlocked == lockState(this)
const STATE_FIRST = /^(\w+)\s*(==|!=)\s*(\w+)\(this\)$/;
// unlocked(this), for a state set without a name
const STATE_ONLY = /^(\w+)\(this\)$/;

/**
 * A part of a transition's condition joined by &&, as written in the spec, with the states it needs if it is about a state
 */
export type ConditionPart = {
    text: string;
    stateCondition: StateCondition | null;
};

/**
 * Splits a transition's condition into its parts joined by a top-level &&, reading each one as the states it needs
 * @param condition the condition as written in the spec, e.g. lockState(this) != locked && size(this) > 0
 * @param sms the state machines of the class, one per state set
 * @returns the parts, a part with an || is not read as states
 */
export function getConditionParts(condition: string, sms: LJStateMachine[]): ConditionPart[] {
    return splitTopLevelAnd(condition).map(text => ({
        text,
        stateCondition: text.includes('||') ? null : parseStateCondition(unwrap(text), sms),
    }));
}

// splits on the && outside parentheses, so a parenthesised || stays in one part
function splitTopLevelAnd(condition: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < condition.length; i++) {
        if (condition[i] === '(') depth++;
        else if (condition[i] === ')') depth--;
        else if (depth === 0 && condition.startsWith('&&', i)) {
            parts.push(condition.slice(start, i).trim());
            start = i + 2;
        }
    }
    return [...parts, condition.slice(start).trim()];
}

function parseStateCondition(text: string, sms: LJStateMachine[]): StateCondition | null {
    const stateSetFirst = text.match(STATE_SET_FIRST);
    const stateFirst = text.match(STATE_FIRST);
    if (stateSetFirst) return getComparedStates(stateSetFirst[1], stateSetFirst[2], stateSetFirst[3], sms);
    if (stateFirst) return getComparedStates(stateFirst[3], stateFirst[2], stateFirst[1], sms);

    const state = text.match(STATE_ONLY)?.[1];
    const withState = state ? sms.filter(sm => sm.states.includes(state)) : [];
    return state && withState.length === 1 ? { stateSet: withState[0], states: [state] } : null;
}

// a != on a state set allows its other states
function getComparedStates(name: string, operator: string, state: string, sms: LJStateMachine[]): StateCondition | null {
    const stateSet = sms.find(sm => sm.stateSetName === name && sm.states.includes(state));
    if (!stateSet) return null;
    return { stateSet, states: operator === '==' ? [state] : stateSet.states.filter(other => other !== state) };
}

function unwrap(text: string): string {
    return text.replace(/^\((.*)\)$/, '$1').trim();
}
