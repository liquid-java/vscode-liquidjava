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
import liquidjava.processor.context.RefinedVariable;
import liquidjava.utils.GeneratedNames;

/**
 * Utility class for converting LiquidJava context objects to DTOs.
 */
public class ContextHistoryConverter {

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
            // the states of a set together, in the order they are declared
            contextHistory.getGhosts().stream().map(GhostDTO::from)
                .sorted(Comparator.comparing(GhostDTO::refinement, Comparator.nullsFirst(Comparator.naturalOrder()))
                    .thenComparing(GhostDTO::name))
                .collect(Collectors.toList()),
            contextHistory.getAliases().stream().map(AliasDTO::from).collect(Collectors.toList()),
            contextHistory.getMethods().stream().map(MethodDTO::from).filter(f -> f != null).collect(Collectors.toList()),
            parseFileScopes(contextHistory.getFileScopes())
        );
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
