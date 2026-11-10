package dtos.context;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

import liquidjava.processor.context.ContextHistory;
import liquidjava.processor.context.GhostFunction;
import liquidjava.processor.context.GhostState;
import liquidjava.processor.context.RefinedVariable;
import liquidjava.rj_language.Predicate;
import liquidjava.rj_language.StateValues;
import liquidjava.rj_language.ast.BinaryExpression;
import liquidjava.rj_language.ast.Expression;
import liquidjava.rj_language.ast.LiteralBoolean;
import liquidjava.rj_language.ast.Var;
import liquidjava.rj_language.ast.formatter.DisplayNames;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;
import liquidjava.utils.GeneratedNames;

/**
 * Shows the variables of a context as the verifier's error messages do: the states of a named set as values of the
 * set, {@code display(host) == notDisplayable}, and variables written alike told apart by the line of their value,
 * {@code host@23}. The values the verifier introduces are not variables of the program: one that stands for a single
 * expression is replaced by it, and a fact about one that is not constrained at all is left out
 */
public final class ContextDisplay {
    private final DisplayNames names;
    private final List<GhostState> states;
    private final List<GhostFunction> stateSets;
    private final Map<String, Expression> generatedValues;
    private final Set<String> unconstrained;

    private ContextDisplay(DisplayNames names, List<GhostState> states, Map<String, Expression> generatedValues,
            Set<String> unconstrained) {
        this.names = names;
        this.states = states;
        // the verifier also passes its other ghost functions, which the context history does not keep
        this.stateSets = states.stream().map(GhostState::getParent).filter(set -> set != null).distinct().toList();
        this.generatedValues = generatedValues;
        this.unconstrained = unconstrained;
    }

    public static ContextDisplay of(ContextHistory history) {
        List<RefinedVariable> variables = Stream.concat(history.getLocalVars().stream(),
                history.getGlobalVars().stream()).toList();
        // the variables of the context first, then the others its refinements mention
        List<String> shown = new ArrayList<>();
        List<String> others = new ArrayList<>();
        Map<String, List<Expression>> generatedFacts = new HashMap<>();
        for (RefinedVariable variable : variables) {
            Expression refinement = variable.getRefinement().getExpression();
            refinement.getVariableNames(others);
            if (!GeneratedNames.isGenerated(variable.getName()))
                shown.add(variable.getName());
            else {
                others.add(variable.getName());
                generatedFacts.computeIfAbsent(variable.getName(), name -> new ArrayList<>()).add(refinement);
            }
        }
        Map<String, Expression> values = new HashMap<>();
        Set<String> unconstrained = new HashSet<>();
        generatedFacts.forEach((name, facts) -> {
            if (facts.stream().allMatch(Expression::isBooleanTrue))
                unconstrained.add(name);
            else
                valueOf(name, facts).ifPresent(value -> values.put(name, value));
        });
        return new ContextDisplay(DisplayNames.of(shown, others, history::lineOf), new ArrayList<>(history.getGhosts()),
                values, unconstrained);
    }

    public String name(String variable) {
        return names.get(variable);
    }

    public String format(Predicate refinement) {
        Expression expression = withoutUnconstrained(inlineGenerated(refinement.getExpression()));
        return ExpressionFormatter.format(StateValues.toSetForm(expression, states, stateSets), names);
    }

    /** The expression a generated value stands for, when every fact about it is {@code name == expression} */
    private static Optional<Expression> valueOf(String name, List<Expression> facts) {
        Set<Expression> values = new HashSet<>();
        for (Expression fact : facts) {
            Optional<Expression> value = equatedTo(name, fact);
            if (value.isEmpty())
                return Optional.empty();
            values.add(value.get());
        }
        return values.size() == 1 ? values.stream().findFirst() : Optional.empty();
    }

    private static Optional<Expression> equatedTo(String name, Expression fact) {
        if (!(fact instanceof BinaryExpression equality && equality.getOperator().equals("==")))
            return Optional.empty();
        Var variable = new Var(name);
        Expression other = variable.equals(equality.getFirstOperand()) ? equality.getSecondOperand()
                : variable.equals(equality.getSecondOperand()) ? equality.getFirstOperand() : null;
        return other == null || mentions(other, name) ? Optional.empty() : Optional.of(other);
    }

    // a value can stand for an expression over other generated values, so it is replaced until none is left
    private Expression inlineGenerated(Expression expression) {
        for (int i = 0; i <= generatedValues.size(); i++) {
            Optional<String> generated = variablesOf(expression).stream().filter(generatedValues::containsKey)
                    .findFirst();
            if (generated.isEmpty())
                break;
            expression = expression.substitute(new Var(generated.get()), generatedValues.get(generated.get()));
        }
        return expression;
    }

    private Expression withoutUnconstrained(Expression expression) {
        return expression.getConjuncts().stream()
                .filter(conjunct -> variablesOf(conjunct).stream().noneMatch(unconstrained::contains))
                .reduce((left, right) -> new BinaryExpression(left, "&&", right))
                .orElse(new LiteralBoolean(true));
    }

    private static boolean mentions(Expression expression, String name) {
        return variablesOf(expression).contains(name);
    }

    private static List<String> variablesOf(Expression expression) {
        List<String> variables = new ArrayList<>();
        expression.getVariableNames(variables);
        return variables;
    }
}
