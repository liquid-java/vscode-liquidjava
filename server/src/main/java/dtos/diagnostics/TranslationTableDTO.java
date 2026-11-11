package dtos.diagnostics;

import java.util.HashMap;

import liquidjava.diagnostics.TranslationTable;
import liquidjava.rj_language.ast.formatter.DisplayNames;
import liquidjava.rj_language.ast.formatter.VariableFormatter;

/**
 * DTO for serializing TranslationTable to JSON
 * Converts the complex Spoon objects to simple serializable objects
 */
public class TranslationTableDTO extends HashMap<String, PlacementInCodeDTO> {

    /**
     * @param names the names the error gives its variables, or null to write them as in code
     */
    public static TranslationTableDTO from(TranslationTable translationTable, DisplayNames names) {
        TranslationTableDTO dto = new TranslationTableDTO();
        if (translationTable != null) {
            translationTable.forEach((key, value) -> {
                dto.put(names == null ? VariableFormatter.format(key) : names.get(key), PlacementInCodeDTO.from(value));
            });
        }
        return dto;
    }
}
