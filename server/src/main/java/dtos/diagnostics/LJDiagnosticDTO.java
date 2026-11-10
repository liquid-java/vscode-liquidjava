package dtos.diagnostics;

import java.util.List;

import liquidjava.diagnostics.LJDiagnostic;

/**
 * DTO for serializing LJDiagnostic instances to JSON
 */
public class LJDiagnosticDTO {

    public final String category;
    public final String type;
    public final String title;
    public final String message;
    public final List<HintDTO> hints;
    public final String file;
    public final SourcePositionDTO position;
    /** Lines under the message that explain it, such as where a value comes from */
    public final List<String> messageNotes;
    /** The places in the source that the message notes and hints name */
    public final List<SourceReferenceDTO> references;

    public LJDiagnosticDTO(String category, String type, LJDiagnostic diagnostic) {
        this(category, type, diagnostic.getTitle(), diagnostic.getMessage(), HintDTO.from(diagnostic.getHints()),
                diagnostic.getFile(), SourcePositionDTO.from(diagnostic.getPosition()), diagnostic.getMessageNotes(),
                SourceReferenceDTO.from(diagnostic.getReferences()));
    }

    public LJDiagnosticDTO(String category, String type, String title, String message, List<HintDTO> hints, String file,
            SourcePositionDTO position) {
        this(category, type, title, message, hints, file, position, List.of(), List.of());
    }

    private LJDiagnosticDTO(String category, String type, String title, String message, List<HintDTO> hints,
            String file, SourcePositionDTO position, List<String> messageNotes, List<SourceReferenceDTO> references) {
        this.category = category;
        this.type = type;
        this.title = title;
        this.message = message;
        this.hints = hints;
        this.file = file;
        this.position = position;
        this.messageNotes = messageNotes;
        this.references = references;
    }

    public static LJDiagnosticDTO from(LJDiagnostic diagnostic) {
        return new LJDiagnosticDTO(null, null, diagnostic);
    }
}
