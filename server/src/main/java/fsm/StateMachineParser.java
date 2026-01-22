package fsm;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import liquidjava.utils.Utils;
import spoon.Launcher;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtConstructor;
import spoon.reflect.declaration.CtInterface;
import spoon.reflect.declaration.CtMethod;
import spoon.reflect.declaration.CtType;

public class StateMachineParser {

    private static final String STATE_SET_ANNOTATION = "StateSet";
    private static final String STATE_REFINEMENT_ANNOTATION = "StateRefinement";
    private static final String EXTERNAL_REFINEMENTS_FOR_ANNOTATION = "ExternalRefinementsFor";

    /**
     * Parses a class or interface for the given uri and extracts the state machine information
     * @param uri
     * @return StateMachine or null if none found
     */
    public static StateMachine parse(String uri) {
        try {
            String filePath = new URI(uri).getPath();
            Launcher launcher = new Launcher();
            launcher.getEnvironment().setNoClasspath(true);
            launcher.getEnvironment().setAutoImports(true);
            launcher.addInputResource(filePath);
            launcher.buildModel();
            CtModel model = launcher.getModel();

            // get class or interface
            CtType<?> ctType = getType(model);
            if (ctType == null) {
                return null;
            }

            // extract class name and states
            List<String> states = getStates(ctType);
            String className = getClassName(ctType);

            // extract initial state and transitions
            String initial;
            List<StateMachineTransition> transitions;
            if (ctType instanceof CtClass<?> ctClass) {
                initial = getInitialStateFromClass(ctClass, states);
                transitions = getTransitionsFromClass(ctClass, states);
            } else if (ctType instanceof CtInterface<?> ctInterface) {
                initial = getInitialStateFromInterface(ctInterface, className, states);
                transitions = getTransitionsFromInterface(ctInterface, className, states);
            } else {
                return null;
            }
            if (transitions == null) return null; // no transitions found
            
            return new StateMachine(className, initial, states, transitions);

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Finds the first class or interface in the model (we assume only one per file)
     * @param model
     * @return CtType or null if none found
     */
    private static CtType<?> getType(CtModel model) {
        for (CtType<?> type : model.getAllTypes()) {
            if (type instanceof CtClass<?> || type instanceof CtInterface<?>) {
                return type;
            }
        }
        return null;
    }

    /**
     * Extracts the simple name from a class or interface
     * Uses name from ExternalRefinementsFor if present, otherwise uses class or interface name
     * @param ctType
     * @return class name
     */
    private static String getClassName(CtType<?> ctType) {
        for (CtAnnotation<?> annotation : ctType.getAnnotations()) {
            if (annotation.getAnnotationType().getSimpleName().equals(EXTERNAL_REFINEMENTS_FOR_ANNOTATION)) {
                String qualifiedName = (String) annotation.getValueAsObject("value");
                return Utils.getSimpleName(qualifiedName);                
            }
        }
        return ctType.getSimpleName();
    }

    /**
     * Extracts the possible states from a class or interface
     * @param ctType
     * @return list of states
     */
    private static List<String> getStates(CtType<?> ctType) {
        for (CtAnnotation<?> annotation : ctType.getAnnotations()) {
            if (annotation.getAnnotationType().getSimpleName().equals(STATE_SET_ANNOTATION)) {
                String[] stateArray = (String[]) annotation.getValueAsObject("value");
                return List.of(stateArray);
            }
        }
        return null;
    }

    /**
     * Extracts the initial state from a class
     * If not explicitely defined, uses the first state in the state set
     * @param ctClass
     * @return initial state
     */
    private static String getInitialStateFromClass(CtClass<?> ctClass, List<String> states) {
        for (CtConstructor<?> constructor : ctClass.getConstructors()) {
            for (CtAnnotation<?> annotation : constructor.getAnnotations()) {
                if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                    Object to = annotation.getValueAsObject("to");
                    return normalizeState(to);
                }
            }
        }
        return states.isEmpty() ? null : states.getFirst();
    }

    /**
     * Extracts the initial state from an interface
     * If not explicitely defined, uses the first state in the state set
     * @param ctInterface
     * @param className
     * @return initial state
     */
    private static String getInitialStateFromInterface(CtInterface<?> ctInterface, String className, List<String> states) {
        for (CtMethod<?> method : ctInterface.getMethods()) {
            if (method.getSimpleName().equals(className)) {
                for (CtAnnotation<?> annotation : method.getAnnotations()) {
                    if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                        Object to = annotation.getValueAsObject("to");
                        return normalizeState(to);
                    }
                }
            }
        }
        return states.isEmpty() ? null : states.getFirst();
    }

    /**
     * Extracts transitions from a class
     * @param ctClass
     * @param states
     * @return list of StateMachineTransition
     */
    private static List<StateMachineTransition> getTransitionsFromClass(CtClass<?> ctClass, List<String> states) {
        List<StateMachineTransition> transitions = new ArrayList<>();
        for (CtMethod<?> method : ctClass.getMethods()) {
            for (CtAnnotation<?> annotation : method.getAnnotations()) {
                if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                    List<StateMachineTransition> extracted = getTransitions(annotation, method.getSimpleName(), states);
                    transitions.addAll(extracted);
                }
            }
        }

        return transitions;
    }

    /**
     * Extracts transitions from an interface
     * @param ctInterface
     * @param className
     * @param states
     * @return list of StateMachineTransition
     */
    private static List<StateMachineTransition> getTransitionsFromInterface(CtInterface<?> ctInterface, String className, List<String> states) {
        List<StateMachineTransition> transitions = new ArrayList<>();
        for (CtMethod<?> method : ctInterface.getMethods()) {
            if (method.getSimpleName().equals(className)) continue; // skip constructor method

            for (CtAnnotation<?> annotation : method.getAnnotations()) {
                if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                    List<StateMachineTransition> extracted = getTransitions(annotation, method.getSimpleName(), states);
                    transitions.addAll(extracted);
                }
            }
        }
        return transitions;
    }

    /**
     * Extracts transitions from the given annotation
     * @param annotation
     * @param methodName
     * @param states
     * @return list of StateMachineTransition
     */
    private static List<StateMachineTransition> getTransitions(CtAnnotation<?> annotation, String methodName, List<String> states) {
        List<StateMachineTransition> transitions = new ArrayList<>();
        String from = normalizeState(annotation.getValueAsObject("from"));
        String to = normalizeState(annotation.getValueAsObject("to"));

        // if has from but not to, to is the same as from (self-loop)
        if (from != null && to == null) {
            to = from;
        }

        // if from is !state, from is all states except state (multiple transitions)
        if (from != null && from.startsWith("!")) {
            String excludedState = from.substring(1);
            if (states != null && to != null) {
                for (String state : states) {
                    if (!state.equals(excludedState)) {
                        transitions.add(new StateMachineTransition(state, to, methodName));
                    }
                }
            }
            return transitions;
        }

        // if has to but not from, from is all states (multiple transitions)
        if (to != null && from == null) {
            if (states != null) {
                for (String state : states) {
                    transitions.add(new StateMachineTransition(state, to, methodName));
                }
            }
            return transitions;
        }

        // normal transition
        if (from != null && to != null) {
            transitions.add(new StateMachineTransition(from, to, methodName));
        }
        return transitions;
    }

    /**
     * Normalizes the state value by removing (this) and returning null if empty
     * @param value
     * @return normalized state
     */
    private static String normalizeState(Object value) {
        if (value == null) return null;
        String normalized = value.toString().replace("(this)", "");
        return normalized.isEmpty() ? null : normalized;
    }
}
