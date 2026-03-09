package utils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import dtos.context.AliasDTO;
import dtos.context.ContextHistoryDTO;
import dtos.context.GhostDTO;
import dtos.context.VariableDTO;
import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.ContextHistory;

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
        return new ContextHistoryDTO(
            contextHistory.getLocalVars().stream().map(VariableDTO::from).collect(Collectors.toList()),
            contextHistory.getGlobalVars().stream().map(VariableDTO::from).collect(Collectors.toList()),
            contextHistory.getGhosts().stream().map(GhostDTO::from).collect(Collectors.toList()),
            contextHistory.getAliases().stream().map(AliasDTO::from).collect(Collectors.toList()),
            parseFileScopes(contextHistory.getFileScopes())
        );
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
