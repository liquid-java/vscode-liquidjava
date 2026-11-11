package dtos.diagnostics;

import java.util.List;

import liquidjava.diagnostics.SourceReference;

/**
 * DTO for serializing a place in the source that a line of a diagnostic names, such as {@code line 134}
 *
 * @param message the whole line, a message note or a hint, as the diagnostic gives it
 * @param text the words of {@code message} that name the place
 * @param start where {@code text} starts in {@code message}
 * @param position the place, with lines and columns from 0 as in the other positions
 */
public record SourceReferenceDTO(String message, String text, int start, SourcePositionDTO position) {

    public static SourceReferenceDTO from(SourceReference reference) {
        SourcePositionDTO position = new SourcePositionDTO(reference.file(), reference.line() - 1,
                reference.column() - 1, reference.line() - 1, reference.column() - 1);
        return new SourceReferenceDTO(reference.message(), reference.text(), reference.start(), position);
    }

    public static List<SourceReferenceDTO> from(List<SourceReference> references) {
        return references.stream().map(SourceReferenceDTO::from).toList();
    }
}
