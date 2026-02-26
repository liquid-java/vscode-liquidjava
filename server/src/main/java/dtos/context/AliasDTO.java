package dtos.context;

import java.util.List;
import java.util.stream.Collectors;

import liquidjava.processor.context.AliasWrapper;

/**
 * DTO for serializing AliasWrapper instances to JSON.
 */
public record AliasDTO(
    String name,
    List<String> parameters,
    List<String> types,
    String predicate
) {
    public static AliasDTO from(AliasWrapper aliasWrapper) {
        return new AliasDTO(
            aliasWrapper.getName(),
            aliasWrapper.getVarNames(),
            aliasWrapper.getTypes().stream().map(ContextHistoryDTO::stringifyType).collect(Collectors.toList()),
            aliasWrapper.getClonedPredicate().toString()
        );
    }
}