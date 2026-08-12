package fsm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

public class StateMachineParserTests {

    private static final String BASE_URI = "src/test/resources/fsm/";

    @Test
    public void testSimpleStateMachine() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "Simple.java");
        StateMachine expectedSm = stateMachine("Simple", List.of("open", "closed"),
                List.of(new StateMachineTransition("open", "closed", "close"),
                        new StateMachineTransition("open", "open", "read")),
                List.of(new StateMachineInitialTransition("open")));
        assertStateMachineEquals(expectedSm, sm);
        assertNull(sm.errorContext(), "Plain state machines should not contain diagnostic context");
    }

    @Test
    public void testStateMachineGroupsErrorContext() {
        StateMachineErrorContext errorContext = new StateMachineErrorContext(
                "read", List.of("closed"));
        StateMachine sm = new StateMachine("Simple", List.of("open", "closed"), List.of(), List.of(), errorContext);

        assertEquals(errorContext, sm.errorContext());
    }

    @Test
    public void testOrTransition() {
        // state1 || state2 => separate transitions from both state1 and state2
        StateMachine sm = StateMachineParser.parse(BASE_URI + "OrTransition.java");
        StateMachine expectedSm = stateMachine("OrTransition", List.of("a", "b", "c"), List
                .of(new StateMachineTransition("a", "c", "action"), new StateMachineTransition("b", "c", "action")),
                List.of(new StateMachineInitialTransition("a")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testNegationTransition() {
        // !state => all states except state
        StateMachine sm = StateMachineParser.parse(BASE_URI + "NegationTransition.java");
        StateMachine expectedSm = stateMachine("NegationTransition", List.of("open", "closed", "locked"),
                List.of(new StateMachineTransition("open", "locked", "lock"),
                        new StateMachineTransition("closed", "locked", "lock")),
                List.of(new StateMachineInitialTransition("open")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testSelfLoop() {
        // from=state, to=state or from=state => self-loop
        StateMachine sm = StateMachineParser.parse(BASE_URI + "SelfLoop.java");
        StateMachine expectedSm = stateMachine("SelfLoop", List.of("idle", "running"),
                List.of(new StateMachineTransition("idle", "idle", "noop"),
                        new StateMachineTransition("idle", "running", "start"),
                        new StateMachineTransition("running", "running", "tick")),
                List.of(new StateMachineInitialTransition("idle")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testToOnlyTransition() {
        // no from => all states contain a transition to state
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ToOnlyTransition.java");
        StateMachine expectedSm = stateMachine("ToOnlyTransition", List.of("a", "b", "c"),
                List.of(new StateMachineTransition("a", "c", "action"), new StateMachineTransition("b", "c", "action"),
                        new StateMachineTransition("c", "c", "action")),
                List.of(new StateMachineInitialTransition("a")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testMultipleInitialStates() {
        // overloading constructors with different initial states
        StateMachine sm = StateMachineParser.parse(BASE_URI + "MultipleInitialStates.java");
        StateMachine expectedSm = stateMachine("MultipleInitialStates", List.of("initialized", "uninitialized", "error"),
                List.of(new StateMachineTransition("uninitialized", "initialized", "init")),
                List.of(new StateMachineInitialTransition("uninitialized"),
                        new StateMachineInitialTransition("initialized")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testExternalRefinementsInterface() {
        // class name from @ExternalStateRefinements
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ExternalRefinements.java");
        StateMachine expectedSm = stateMachine("Connection", List.of("connected", "disconnected"),
                List.of(new StateMachineTransition("disconnected", "connected", "connect")),
                List.of(new StateMachineInitialTransition("disconnected")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testConditionalTransition() {
        // transitions for both branches of condition
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ConditionalTransition.java");
        StateMachine expectedSm = stateMachine("ConditionalTransition", List.of("on", "off"),
                List.of(new StateMachineTransition("on", "off", "turnOff"),
                        new StateMachineTransition("off", "on", "turnOn")),
                List.of(new StateMachineInitialTransition("on", "flag"),
                        new StateMachineInitialTransition("off", "!flag")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testConjunctionInitialTransition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ConjunctionInitialTransition.java");
        StateMachine expectedSm = stateMachine("ConjunctionInitialTransition", List.of("on", "off"),
                List.of(new StateMachineTransition("on", "off", "turnOff")),
                List.of(new StateMachineInitialTransition("on", "flag")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testConjunctionPrecondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ConjunctionPrecondition.java");
        StateMachine expectedSm = stateMachine("ConjunctionPrecondition", List.of("open", "closed"),
                List.of(new StateMachineTransition("open", "closed", "close", "flag", null)),
                List.of(new StateMachineInitialTransition("open")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testDisjunctionPrecondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "DisjunctionPrecondition.java");
        StateMachine expectedSm = stateMachine("DisjunctionPrecondition", List.of("ready", "waiting", "done"),
                List.of(new StateMachineTransition("waiting", "done", "action", "flag", null),
                        new StateMachineTransition("done", "done", "action", "flag", null),
                        new StateMachineTransition("ready", "done", "action")),
                List.of(new StateMachineInitialTransition("ready")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testConditionalPrecondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ConditionalPrecondition.java");
        StateMachine expectedSm = stateMachine("ConditionalPrecondition", List.of("left", "right", "done"),
                List.of(new StateMachineTransition("left", "done", "finish", "flag", null),
                        new StateMachineTransition("right", "done", "finish", "!flag", null)),
                List.of(new StateMachineInitialTransition("left")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testPostConditionFiltering() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "PostConditionFiltering.java");
        StateMachine expectedSm = stateMachine("PostConditionFiltering", List.of("ready", "done"),
                List.of(new StateMachineTransition("ready", "done", "finish", null, "flag")),
                List.of(new StateMachineInitialTransition("ready")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testCombinedPostCondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "CombinedPostCondition.java");
        StateMachine expectedSm = stateMachine("CombinedPostCondition", List.of("ready", "done"),
                List.of(new StateMachineTransition("ready", "done", "finish", "x", "flag")),
                List.of(new StateMachineInitialTransition("ready")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testConditionalPostCondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "ConditionalPostCondition.java");
        StateMachine expectedSm = stateMachine("ConditionalPostCondition", List.of("ready", "done", "error"),
                List.of(new StateMachineTransition("ready", "done", "finish", null, "flag"),
                        new StateMachineTransition("ready", "error", "finish", null, "!flag")),
                List.of(new StateMachineInitialTransition("ready")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testDisjunctionPostCondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "DisjunctionPostCondition.java");
        StateMachine expectedSm = stateMachine("DisjunctionPostCondition", List.of("ready", "done"),
                List.of(new StateMachineTransition("ready", "done", "finish")),
                List.of(new StateMachineInitialTransition("ready")));
        assertStateMachineEquals(expectedSm, sm);
    }

    @Test
    public void testGuardedSelfLoopDoesNotDuplicateCondition() {
        StateMachine sm = StateMachineParser.parse(BASE_URI + "GuardedSelfLoop.java");
        StateMachine expectedSm = stateMachine("GuardedSelfLoop", List.of("ready", "done"),
                List.of(new StateMachineTransition("ready", "ready", "poll", "flag", null)),
                List.of(new StateMachineInitialTransition("ready")));
        assertStateMachineEquals(expectedSm, sm);
    }

    private static void assertStateMachineEquals(StateMachine expected, StateMachine actual) {
        assertNotNull(actual, "State machine should not be null");
        assertEquals(expected.className(), actual.className(), "Class names should match");
        assertEquals(expected.initialTransitions(), actual.initialTransitions(), "Initial transitions should match");
        assertEquals(expected.states(), actual.states(), "States should match");
        assertEquals(expected.transitions(), actual.transitions(), "State transitions should match");
        assertEquals(expected.errorContext(), actual.errorContext(), "Error contexts should match");
    }

    private static StateMachine stateMachine(String className, List<String> states,
            List<StateMachineTransition> transitions, List<StateMachineInitialTransition> initialTransitions) {
        return new StateMachine(className, states, transitions, initialTransitions, null);
    }
}
