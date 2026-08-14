package dtos.errors;

import dtos.diagnostics.LJDiagnosticDTO;
import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.errors.LJError;

/**
 * DTO for serializing LJError instances to JSON
 */
public class LJErrorDTO extends LJDiagnosticDTO {

    public final TranslationTableDTO translationTable;

    public LJErrorDTO(String type, LJError error) {
        super("error", type, error);
        this.translationTable = TranslationTableDTO.from(error.getTranslationTable());
    }

    protected LJErrorDTO(String category, String type, LJError error) {
        super(category, type, error);
        this.translationTable = TranslationTableDTO.from(error.getTranslationTable());
    }

    public LJErrorDTO(String category, String type, String title, String message, String hint, String file,
            SourcePositionDTO position, TranslationTableDTO translationTable) {
        super(category, type, title, message, hint, file, position);
        this.translationTable = translationTable;
    }

    public static LJErrorDTO from(LJError error) {
        return new LJErrorDTO(null, error);
    }
}
