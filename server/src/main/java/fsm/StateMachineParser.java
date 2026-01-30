package fsm;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import liquidjava.rj_language.ast.*;
import liquidjava.rj_language.parsing.RefinementsParser;
import liquidjava.utils.Utils;
import spoon.Launcher;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtElement;
import spoon.reflect.declaration.CtMethod;
import spoon.reflect.declaration.CtType;

public class StateMachineParser {

    private static final String STATE_SET_ANNOTATION = "StateSet";
    private static final String STATE_REFINEMENT_ANNOTATION = "StateRefinement";
    private static final String EXTERNAL_REFINEMENTS_FOR_ANNOTATION = "ExternalRefinementsFor";

    /**
     * Parses a class or interface for the given uri and extracts the state machine information
     * @param uri the document URI
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
            if (ctType == null)
                return null; // no class or interface found

            // extract class name and states
            List<String> states = getStates(ctType);
            if (states == null || states.isEmpty())
                return null; // no states found
            String className = getClassName(ctType);

            // get initial states and transitions
            List<String> initialStates = getInitialStates(ctType, className, states);
            List<StateMachineTransition> transitions = getTransitions(ctType, className, states);
            if (transitions.isEmpty())
                return null; // no transitions found

            return new StateMachine(className, initialStates, states, transitions);

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Finds the first class or interface in the model (we assume only one per file)
     * @param model the CtModel
     * @return CtType or null if none found
     */
    private static CtType<?> getType(CtModel model) {
        for (CtType<?> type : model.getAllTypes()) {
            if (type.isClass() || type.isInterface())
                return type;
        }
        return null;
    }

    /**
     * Gets the simple name from a class or interface
     * Uses name from ExternalRefinementsFor if present, otherwise uses class or interface name
     * @param ctType the CtType (class or interface)
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
     * @param ctType the CtType (class or interface)
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
     * Gets the elements that represent constructors (actual constructors for classes, methods named after the class for interfaces)
     * @param ctType the CtType (class or interface)
     * @param className the class name
     * @return collection of constructor elements
     */
    private static Collection<? extends CtElement> getConstructorElements(CtType<?> ctType, String className) {
        if (ctType instanceof CtClass<?> ctClass) {
            return ctClass.getConstructors();
        }
        // for interfaces the constructors are methods with the same name as the class
        return ctType.getMethods().stream().filter(m -> m.getSimpleName().equals(className)).toList();
    }

    /**
     * Gets the initial states from a class or interface
     * If not explicitly defined, uses the first state in the state set
     * @param ctType the CtType (class or interface)
     * @param className the class name
     * @param states the list of states
     * @return initial states
     */
    private static List<String> getInitialStates(CtType<?> ctType, String className, List<String> states) {
        Set<String> initialStates = new HashSet<>();
        for (CtElement element : getConstructorElements(ctType, className)) {
            for (CtAnnotation<?> annotation : element.getAnnotations()) {
                if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                    String to = annotation.getValueAsString("to");
                    List<String> parsedStates = parseStateExpression(to, states);
                    initialStates.addAll(parsedStates);
                }
            }
        }
        return initialStates.isEmpty() ? List.of(states.get(0)) : initialStates.stream().toList();
    }

    /**
     * Gets transitions from a class or interface
     * @param ctType the CtType (class or interface)
     * @param className the class name
     * @param states the list of states
     * @return list of StateMachineTransition
     */
    private static List<StateMachineTransition> getTransitions(CtType<?> ctType, String className, List<String> states) {
        List<StateMachineTransition> transitions = new ArrayList<>();
        for (CtMethod<?> method : ctType.getMethods()) {
            // for interfaces we skip constructor methods (methods with same name as class)
            if (ctType.isInterface() && method.getSimpleName().equals(className))
                continue;

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
     * @param ann the CtAnnotation
     * @param method the method name
     * @param states the list of states
     * @return list of StateMachineTransition
     */
    private static List<StateMachineTransition> getTransitions(CtAnnotation<?> ann, String method, List<String> states) {
        List<StateMachineTransition> transitions = new ArrayList<>();
        String from = ann.getValueAsString("from");
        String to = ann.getValueAsString("to");

        // if has from but not to, to is the same as from (self-loop)
        if (!from.isEmpty() && to.isEmpty()) {
            to = from;
        }

        // parse from and to expressions
        List<String> fromStates = parseStateExpression(from, states);
        List<String> toStates = parseStateExpression(to, states);

        // if no from states, use all states
        if (fromStates.isEmpty()) {
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
     * @param expr the expression
     * @param states the list of possible states
     * @return list of states
     */
    private static List<String> parseStateExpression(String expr, List<String> states) {
        if (expr == null || expr.isEmpty()) return new ArrayList<>();
        Expression ast = RefinementsParser.createAST(expr, "");
        return getStateExpressions(ast, states);
    }

    /**
     * Gets state names from an expression AST recursively
     * @param expr the expression
     * @param states the list of possible states
     * @return list of states
     */
    private static List<String> getStateExpressions(Expression expr, List<String> states) {
        List<String> stateExpressions = new ArrayList<>();
        switch (expr) {
            case Var var -> stateExpressions.add(var.getName());
            case FunctionInvocation func -> stateExpressions.add(func.getName());
            case GroupExpression group -> stateExpressions.addAll(getStateExpressions(group.getExpression(), states));
            case BinaryExpression bin -> {
                String op = bin.getOperator();
                if (op.equals("||")) {
                    // combine states from both operands
                    stateExpressions.addAll(getStateExpressions(bin.getFirstOperand(), states));
                    stateExpressions.addAll(getStateExpressions(bin.getSecondOperand(), states));
                }
            }
            case UnaryExpression unary -> {
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
            case Ite ite -> {
                // combine states from then and else branches
                // TODO: handle conditional transitions
                stateExpressions.addAll(getStateExpressions(ite.getThen(), states));
                stateExpressions.addAll(getStateExpressions(ite.getElse(), states));
            }
            default -> {}
        }
        return stateExpressions;
    }
}
