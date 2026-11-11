package utils;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import dtos.context.AliasDTO;
import dtos.context.ContextDisplay;
import dtos.context.ContextHistoryDTO;
import dtos.context.MethodDTO;
import dtos.context.GhostDTO;
import dtos.context.VariableDTO;
import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.ContextHistory;
import liquidjava.processor.context.GhostFunction;
import liquidjava.processor.context.GhostState;
import liquidjava.processor.context.RefinedVariable;
import liquidjava.rj_language.ast.BinaryExpression;
import liquidjava.rj_language.ast.Expression;
import liquidjava.rj_language.ast.LiteralInt;
import liquidjava.utils.GeneratedNames;

/**
 * Utility class for converting LiquidJava context objects to DTOs.
 */
public class ContextHistoryConverter {

    // the ghosts first, then the states of each set together, in the order they are declared
    private static final Comparator<GhostState> GHOST_ORDER = Comparator
        .comparing(ContextHistoryConverter::setOf)
        .thenComparingInt(ContextHistoryConverter::stateIndex)
        .thenComparing(GhostState::getName);

    /**
     * Converts a ContextHistory to its DTO type.
     * @param contextHistory the context history to convert
     * @return the corresponding DTO
     */
    public static ContextHistoryDTO convertToDTO(ContextHistory contextHistory) {
        ContextDisplay display = ContextDisplay.of(contextHistory);
        return new ContextHistoryDTO(
            convertVariables(contextHistory.getLocalVars(), display),
            convertVariables(contextHistory.getGlobalVars(), display),
            contextHistory.getGhosts().stream().sorted(GHOST_ORDER).map(GhostDTO::from).collect(Collectors.toList()),
            contextHistory.getAliases().stream().map(AliasDTO::from).collect(Collectors.toList()),
            contextHistory.getMethods().stream().map(MethodDTO::from).filter(f -> f != null).collect(Collectors.toList()),
            parseFileScopes(contextHistory.getFileScopes())
        );
    }

    private static String setOf(GhostState ghost) {
        GhostFunction set = ghost.getParent();
        return set == null ? "" : set.getPrefix() + "." + set.getName();
    }

    // a state of a set is refined as set(_) == index
    private static int stateIndex(GhostState ghost) {
        Expression refinement = ghost.getRefinement() == null ? null : ghost.getRefinement().getExpression();
        return refinement instanceof BinaryExpression b && b.getSecondOperand() instanceof LiteralInt index
            ? index.getValue() : -1;
    }

    // the values the verifier introduces are not variables of the program
    private static List<VariableDTO> convertVariables(Set<RefinedVariable> variables, ContextDisplay display) {
        return variables.stream()
            .filter(v -> !GeneratedNames.isGenerated(v.getName()))
            .map(v -> VariableDTO.from(v, display))
            .filter(v -> v != null)
            .collect(Collectors.toList());
    }

    private static Map<String, List<SourcePositionDTO>> parseFileScopes(Map<String, Set<String>> fileScopes) {
        return fileScopes.entrySet().stream().collect(Collectors.toMap(
            Map.Entry::getKey,
            entry -> entry.getValue().stream().map(SourcePositionDTO::from).collect(Collectors.toList()),
            (left, right) -> left,
            HashMap::new
        ));
    }
}
