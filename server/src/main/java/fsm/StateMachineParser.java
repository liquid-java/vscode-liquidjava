package fsm;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import liquidjava.rj_language.ast.*;
import liquidjava.rj_language.parsing.RefinementsParser;
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
            if (states == null || states.isEmpty()) {
                return null;
            }

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
     * Gets the simple name from a class or interface
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
     * Gets the possible states from a class or interface
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
     * Gets the initial state from a class
     * If not explicitely defined, uses the first state in the state set
     * @param ctClass
     * @return initial state
     */
    private static String getInitialStateFromClass(CtClass<?> ctClass, List<String> states) {
        for (CtConstructor<?> constructor : ctClass.getConstructors()) {
            for (CtAnnotation<?> annotation : constructor.getAnnotations()) {
                if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                    String to = annotation.getValueAsString("to");
                    List<String> parsedStates = parseStateExpression(to, states);
                    if (!parsedStates.isEmpty()) {
                        return parsedStates.getFirst();
                    }
                }
            }
        }
        return states.getFirst();
    }

    /**
     * Gets the initial state from an interface
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
                        String to = annotation.getValueAsString("to");
                        List<String> parsedStates = parseStateExpression(to, states);
                        if (!parsedStates.isEmpty()) {
                            return parsedStates.getFirst();
                        }
                    }
                }
            }
        }
        return states.isEmpty() ? null : states.getFirst();
    }

    /**
     * Gets transitions from a class
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
     * Gets transitions from an interface
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
     * Gets transitions from the given annotation
     * @param ann
     * @param method
     * @param states
     * @return list of StateMachineTransition
     */
    private static List<StateMachineTransition> getTransitions(CtAnnotation<?> ann, String method, List<String> states) {
        List<StateMachineTransition> transitions = new ArrayList<>();
        String from = ann.getValueAsString("from");
        String to = ann.getValueAsString("to");

        // if has from but not to, to is the same as from (self-loop)
        if (from != null && to == null) {
            to = from;
        }

        // parse from and to expressions
        List<String> fromStates = parseStateExpression(from, states);
        List<String> toStates = parseStateExpression(to, states);

        // if no from states, use all states
        if (fromStates.isEmpty() && to != null) {
            fromStates = new ArrayList<>(states);
        }

        // create transitions for each combination of from and to states
        for (String fromState : fromStates) {
            for (String toState : toStates) {
                transitions.add(new StateMachineTransition(fromState, toState, method));
            }
        }
        return transitions;
    }

    /**
     * Parses a state expression and returns the list of states
     * @param expr
     * @param states
     * @return list of states
     */
    private static List<String> parseStateExpression(String expr, List<String> states) {
        if (expr == null || expr.isEmpty()) return new ArrayList<>();
        Expression ast = RefinementsParser.createAST(expr, "");
        return getStateExpressions(ast, states);
    }

    /**
     * Gets state names from an expression AST recursively
     * @param expr
     * @param states
     * @return list of states
     */
    private static List<String> getStateExpressions(Expression expr, List<String> states) {
        List<String> stateExpressions = new ArrayList<>();
        if (expr instanceof Var var) {
            stateExpressions.add(var.getName());
        } else if (expr instanceof FunctionInvocation func) {
            stateExpressions.add(func.getName());
        } else if (expr instanceof GroupExpression group) {
            stateExpressions.addAll(getStateExpressions(group.getExpression(), states));
        } else if (expr instanceof BinaryExpression bin) {
            String op = bin.getOperator();
            if (op.equals("||")) {
                // combine states from both operands
                stateExpressions.addAll(getStateExpressions(bin.getFirstOperand(), states));
                stateExpressions.addAll(getStateExpressions(bin.getSecondOperand(), states));
            }
        } else if (expr instanceof UnaryExpression unary) {
            if (unary.getOp().equals("!")) {
                // all except those in the expression
                List<String> negatedStates = getStateExpressions(unary.getExpression(), states);
                for (String state : states) {
                    if (!negatedStates.contains(state)) {
                        stateExpressions.add(state);
                    }
                }
            }
        }
        return stateExpressions;
    }
}
