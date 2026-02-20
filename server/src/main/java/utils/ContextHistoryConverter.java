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
import liquidjava.processor.context.ContextHistory;
import liquidjava.processor.context.GhostState;
import liquidjava.processor.context.RefinedVariable;

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
            toVariablesMap(contextHistory.getVars()),
            contextHistory.getInstanceVars().stream().map(VariableDTO::from).collect(Collectors.toList()),
            contextHistory.getGlobalVars().stream().map(VariableDTO::from).collect(Collectors.toList()),
            toGhostsMap(contextHistory.getGhosts()),
            contextHistory.getAliases().stream().map(AliasDTO::from).collect(Collectors.toList())
        );
    }

    private static Map<String, Map<String, List<VariableDTO>>> toVariablesMap(Map<String, Map<String, Set<RefinedVariable>>> vars) {
        return vars.entrySet().stream().collect(Collectors.toMap(
            Map.Entry::getKey,
            entry -> entry.getValue().entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                innerEntry -> innerEntry.getValue().stream().map(VariableDTO::from).collect(Collectors.toList()),
                (left, right) -> left,
                HashMap::new
            )),
            (left, right) -> left,
            HashMap::new
        ));
    }

    private static Map<String, List<GhostDTO>> toGhostsMap(Map<String, Set<GhostState>> ghosts) {
        return ghosts.entrySet().stream().collect(Collectors.toMap(
            Map.Entry::getKey,
            entry -> entry.getValue().stream().map(GhostDTO::from).collect(Collectors.toList()),
            (left, right) -> left,
            HashMap::new
        ));
    }
}
