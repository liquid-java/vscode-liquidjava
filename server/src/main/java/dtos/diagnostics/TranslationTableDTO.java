package dtos.diagnostics;

import java.util.HashMap;

import liquidjava.diagnostics.TranslationTable;
import liquidjava.utils.VariableFormatter;

/**
 * DTO for serializing TranslationTable to JSON
 * Converts the complex Spoon objects to simple serializable objects
 */
public class TranslationTableDTO extends HashMap<String, PlacementInCodeDTO> {

    public static TranslationTableDTO from(TranslationTable translationTable) {
        TranslationTableDTO dto = new TranslationTableDTO();
        if (translationTable != null) {
            translationTable.forEach((key, value) -> {
                dto.put(VariableFormatter.formatVariable(key), PlacementInCodeDTO.from(value));
            });
        }
        return dto;
    }
}
