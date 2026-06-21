package dtos.diagnostics;

import liquidjava.diagnostics.LJDiagnostic;

/**
 * DTO for serializing LJDiagnostic instances to JSON
 */
public class LJDiagnosticDTO {

    public final String category;
    public final String type;
    public final String title;
    public final String message;
    public final String details;
    public final String file;
    public final SourcePositionDTO position;

    public LJDiagnosticDTO(String category, String type, LJDiagnostic diagnostic) {
        this(category, type, diagnostic.getTitle(), diagnostic.getMessage(), diagnostic.getDetails(),
                diagnostic.getFile(), SourcePositionDTO.from(diagnostic.getPosition()));
    }

    public LJDiagnosticDTO(String category, String type, String title, String message, String details, String file,
            SourcePositionDTO position) {
        this.category = category;
        this.type = type;
        this.title = title;
        this.message = message;
        this.details = details;
        this.file = file;
        this.position = position;
    }

    public static LJDiagnosticDTO from(LJDiagnostic diagnostic) {
        return new LJDiagnosticDTO(null, null, diagnostic);
    }
}
