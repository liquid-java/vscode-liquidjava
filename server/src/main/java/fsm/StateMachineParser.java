package fsm;

import java.net.URI;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import liquidjava.rj_language.ast.*;
import liquidjava.rj_language.parsing.RefinementsParser;
import liquidjava.processor.VCImplication;
import liquidjava.utils.Utils;
import spoon.Launcher;
import spoon.reflect.CtModel;
import spoon.reflect.declaration.CtAnnotation;
import spoon.reflect.declaration.CtClass;
import spoon.reflect.declaration.CtElement;
import spoon.reflect.declaration.CtMethod;
import spoon.reflect.declaration.CtType;
import spoon.reflect.cu.SourcePosition;

public class StateMachineParser {

    private static final String STATE_SET_ANNOTATION = "StateSet";
    private static final String STATE_REFINEMENT_ANNOTATION = "StateRefinement";
    private static final String EXTERNAL_REFINEMENTS_FOR_ANNOTATION = "ExternalRefinementsFor";

    private record TransitionSource(String from, String cond) {}

    /**
     * Parses a class or interface for the given uri and extracts the state machine information
     * @param uri the document URI
     * @return StateMachine or null if none found
     */
    public static StateMachine parse(String uri) {
        return parse(uri, null, null, null);
    }

    public static StateMachine parseWithErrorContext(String uri, SourcePosition declarationPosition,
            Expression expectedState, VCImplication foundState) {
        return parse(uri, declarationPosition, expectedState, foundState);
    }

    private static StateMachine parse(String uri, SourcePosition declarationPosition,
            Expression expectedState, VCImplication foundState) {
        try {
            String filePath = Paths.get(new URI(uri)).toString();
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

            // get initial transitions and method transitions
            List<StateMachineInitialTransition> initialTransitions = getInitialTransitions(ctType, className, states);
            if (initialTransitions.isEmpty()) {
                initialTransitions = List.of(new StateMachineInitialTransition(states.get(0)));
            }
            List<StateMachineTransition> transitions = getTransitions(ctType, className, states);
            if (transitions.isEmpty())
                return null; // no transitions found

            CtMethod<?> calledMethod = declarationPosition == null ? null : ctType.getMethods().stream()
                    .filter(method -> method.getPosition().equals(declarationPosition))
                    .findFirst()
                    .orElse(null);
            StateMachineErrorContext errorContext = declarationPosition == null && expectedState == null
                    && foundState == null ? null : new StateMachineErrorContext(
                    calledMethod == null ? null : calledMethod.getSimpleName(),
                    getActualStates(expectedState, foundState, states));
            return new StateMachine(className, states, transitions, initialTransitions, errorContext);

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private static List<String> getActualStates(Expression expectedState, VCImplication foundState,
            List<String> states) {
        String receiver = getStateReceiver(expectedState, states);
        if (receiver == null || foundState == null) return List.of();

        List<String> foundStates = new ArrayList<>();
        for (VCImplication premise = foundState; premise != null; premise = premise.getNext()) {
            if (premise.hasBinder() && receiver.equals(premise.getName()) && premise.getRefinement() != null) {
                foundStates.addAll(getStateExpressions(premise.getRefinement().getExpression(), states, receiver));
            }
        }
        return states.stream().filter(foundStates::contains).toList();
    }

    private static String getStateReceiver(Expression expr, List<String> states) {
        if (expr == null) return null;
        if (expr instanceof FunctionInvocation invocation
                && findState(invocation.getName(), states) != null
                && !invocation.getArgs().isEmpty()
                && invocation.getArgs().get(0) instanceof Var receiver) {
            return receiver.getName();
        }
        for (Expression child : expr.getChildren()) {
            String receiver = getStateReceiver(child, states);
            if (receiver != null) return receiver;
        }
        return null;
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
     * Gets the initial transitions from a class or interface
     * If not explicitly defined, uses the first state in the state set
     * @param ctType the CtType (class or interface)
     * @param className the class name
     * @param states the list of states
     * @return initial transitions
     */
    private static List<StateMachineInitialTransition> getInitialTransitions(CtType<?> ctType, String className, List<String> states) {
        List<StateMachineInitialTransition> initialTransitions = new ArrayList<>();
        for (CtElement element : getConstructorElements(ctType, className)) {
            for (CtAnnotation<?> annotation : element.getAnnotations()) {
                if (annotation.getAnnotationType().getSimpleName().equals(STATE_REFINEMENT_ANNOTATION)) {
                    String to = annotation.getValueAsString("to");
                    initialTransitions.addAll(parseInitialTransitions(to, states));
                }
            }
        }
        return initialTransitions;
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
                    transitions.addAll(getTransitions(annotation, method.getSimpleName(), states));
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

        // parse from and to expressions
        List<TransitionSource> fromSources = from.isEmpty() ? allStateSources(states) : parsePrecondition(from, states);
        List<TransitionSource> toSources = !from.isEmpty() && to.isEmpty()
                ? parseStateSources(from, states)
                : parsePostcondition(to, states);

        // create transitions for each combination of from and to states
        for (TransitionSource fromSource : fromSources) {
            for (TransitionSource toSource : toSources) {
                transitions.add(new StateMachineTransition(fromSource.from(), toSource.from(), method, fromSource.cond(), toSource.cond()));
            }
        }
        return transitions;
    }

    private static List<TransitionSource> allStateSources(List<String> states) {
        List<TransitionSource> sources = new ArrayList<>();
        for (String state : states) {
            sources.add(new TransitionSource(state, null));
        }
        return sources;
    }

    private static List<TransitionSource> parsePrecondition(String expr, List<String> states) {
        Expression ast = RefinementsParser.createAST(expr, "");
        List<TransitionSource> sources = getTransitionSources(ast, states, false);
        if (sources.isEmpty()) {
            sources = addCondition(allStateSources(states), ast.toString());
        }
        return sources;
    }

    private static List<TransitionSource> parsePostcondition(String expr, List<String> states) {
        if (expr == null || expr.isEmpty()) return new ArrayList<>();
        Expression ast = RefinementsParser.createAST(expr, "");
        return getTransitionSources(ast, states, true);
    }

    private static List<TransitionSource> getTransitionSources(Expression expr, List<String> states, boolean stateOnlyDisjunctions) {
        String state = getStateName(expr, states);
        if (state != null) {
            return List.of(new TransitionSource(state, null));
        }

        if (expr instanceof BinaryExpression bin) {
            String op = bin.getOperator();
            if (op.equals("&&")) {
                return getConjunctionSources(bin, states, stateOnlyDisjunctions);
            } else if (op.equals("||")) {
                return stateOnlyDisjunctions ? getStateSources(bin, states) : getDisjunctionSources(bin, states);
            }
        } else if (expr instanceof UnaryExpression unary) {
            if (unary.getOp().equals("!")) {
                List<String> negatedStates = getStateExpressions(unary.getExpression(), states);
                if (!negatedStates.isEmpty()) {
                    List<TransitionSource> sources = new ArrayList<>();
                    for (String possibleState : states) {
                        if (!negatedStates.contains(possibleState)) {
                            sources.add(new TransitionSource(possibleState, null));
                        }
                    }
                    return sources;
                }
            }
        } else if (expr instanceof Ite ite) {
            List<TransitionSource> sources = new ArrayList<>();
            sources.addAll(addCondition(getTransitionSources(ite.getThen(), states, stateOnlyDisjunctions), ite.getCondition().toString()));
            sources.addAll(addCondition(getTransitionSources(ite.getElse(), states, stateOnlyDisjunctions), negateCondition(ite.getCondition())));
            return sources;
        }
        return new ArrayList<>();
    }

    private static List<TransitionSource> getConjunctionSources(BinaryExpression bin, List<String> states, boolean stateOnlyDisjunctions) {
        List<TransitionSource> leftSources = getTransitionSources(bin.getFirstOperand(), states, stateOnlyDisjunctions);
        List<TransitionSource> rightSources = getTransitionSources(bin.getSecondOperand(), states, stateOnlyDisjunctions);

        if (leftSources.isEmpty() && rightSources.isEmpty()) {
            return new ArrayList<>();
        } else if (leftSources.isEmpty()) {
            return addCondition(rightSources, bin.getFirstOperand().toString());
        } else if (rightSources.isEmpty()) {
            return addCondition(leftSources, bin.getSecondOperand().toString());
        }

        List<TransitionSource> sources = new ArrayList<>(leftSources);
        sources.addAll(rightSources);
        return sources;
    }

    private static List<TransitionSource> getDisjunctionSources(BinaryExpression bin, List<String> states) {
        List<TransitionSource> sources = new ArrayList<>();
        addDisjunctionBranch(sources, bin.getFirstOperand(), states);
        addDisjunctionBranch(sources, bin.getSecondOperand(), states);
        return removeRedundantGuardedSources(sources);
    }

    private static void addDisjunctionBranch(List<TransitionSource> sources, Expression expr, List<String> states) {
        List<TransitionSource> parsedSources = getTransitionSources(expr, states, false);
        if (parsedSources.isEmpty()) {
            sources.addAll(addCondition(allStateSources(states), expr.toString()));
        } else {
            sources.addAll(parsedSources);
        }
    }

    private static List<TransitionSource> removeRedundantGuardedSources(List<TransitionSource> sources) {
        List<TransitionSource> filteredSources = new ArrayList<>();
        for (TransitionSource source : sources) {
            if (source.cond() == null || !hasUnguardedSource(sources, source.from())) {
                filteredSources.add(source);
            }
        }
        return filteredSources;
    }

    private static boolean hasUnguardedSource(List<TransitionSource> sources, String from) {
        for (TransitionSource source : sources) {
            if (source.from().equals(from) && source.cond() == null) {
                return true;
            }
        }
        return false;
    }

    private static List<TransitionSource> addCondition(List<TransitionSource> sources, String cond) {
        List<TransitionSource> guardedSources = new ArrayList<>();
        for (TransitionSource source : sources) {
            guardedSources.add(new TransitionSource(source.from(), combineConditions(source.cond(), cond)));
        }
        return guardedSources;
    }

    private static String combineConditions(String first, String second) {
        if (first == null || first.isEmpty()) {
            return second;
        }
        if (second == null || second.isEmpty()) {
            return first;
        }
        return first + " && " + second;
    }

    private static String negateCondition(Expression expr) {
        String condition = expr.toString();
        if (expr instanceof Var || expr instanceof FunctionInvocation) {
            return "!" + condition;
        }
        return "!(" + condition + ")";
    }

    private static List<StateMachineInitialTransition> parseInitialTransitions(String expr, List<String> states) {
        if (expr == null || expr.isEmpty()) return new ArrayList<>();
        List<StateMachineInitialTransition> initialTransitions = new ArrayList<>();
        for (TransitionSource source : parsePostcondition(expr, states)) {
            initialTransitions.add(new StateMachineInitialTransition(source.from(), source.cond()));
        }
        return initialTransitions;
    }

    private static List<TransitionSource> parseStateSources(String expr, List<String> states) {
        if (expr == null || expr.isEmpty()) return new ArrayList<>();
        Expression ast = RefinementsParser.createAST(expr, "");
        return getStateSources(ast, states);
    }

    private static List<TransitionSource> getStateSources(Expression expr, List<String> states) {
        List<TransitionSource> sources = new ArrayList<>();
        for (String state : getStateExpressions(expr, states)) {
            sources.add(new TransitionSource(state, null));
        }
        return sources;
    }

    /**
     * Gets state names from an expression AST recursively
     * @param expr the expression
     * @param states the list of possible states
     * @return list of states
     */
    private static List<String> getStateExpressions(Expression expr, List<String> states) {
        return getStateExpressions(expr, states, null);
    }

    private static List<String> getStateExpressions(Expression expr, List<String> states, String receiver) {
        List<String> stateExpressions = new ArrayList<>();
        String state = getStateName(expr, states, receiver);
        if (state != null) {
            stateExpressions.add(state);
        } else if (expr instanceof BinaryExpression bin) {
            stateExpressions.addAll(getStateExpressions(bin.getFirstOperand(), states, receiver));
            stateExpressions.addAll(getStateExpressions(bin.getSecondOperand(), states, receiver));
        } else if (expr instanceof UnaryExpression unary) {
            if (unary.getOp().equals("!")) {
                // all except those in the expression
                List<String> negatedStates = getStateExpressions(unary.getExpression(), states, receiver);
                if (!negatedStates.isEmpty()) {
                    for (String possibleState : states) {
                        if (!negatedStates.contains(possibleState)) {
                            stateExpressions.add(possibleState);
                        }
                    }
                }
            }
        } else if (expr instanceof Ite ite) {
            // combine states from then and else branches
            stateExpressions.addAll(getStateExpressions(ite.getThen(), states, receiver));
            stateExpressions.addAll(getStateExpressions(ite.getElse(), states, receiver));
        }
        return stateExpressions;
    }

    private static String getStateName(Expression expr, List<String> states) {
        return getStateName(expr, states, null);
    }

    private static String getStateName(Expression expr, List<String> states, String receiver) {
        if (expr instanceof Var var) {
            return findState(var.getName(), states);
        } else if (expr instanceof FunctionInvocation func) {
            String state = findState(func.getName(), states);
            if (state == null || receiver == null) return state;
            if (!func.getArgs().isEmpty()
                    && func.getArgs().get(0) instanceof Var target
                    && receiver.equals(target.getName())) {
                return state;
            }
        }
        return null;
    }

    private static String findState(String name, List<String> states) {
        if (states.contains(name)) {
            return name;
        }
        String simpleName = Utils.getSimpleName(name);
        for (String state : states) {
            if (state.equals(simpleName) || Utils.getSimpleName(state).equals(simpleName)) {
                return state;
            }
        }
        return null;
    }
}
