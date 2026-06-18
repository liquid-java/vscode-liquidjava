package dtos.errors;

import liquidjava.diagnostics.errors.NotFoundError;

/**
 * DTO for serializing NotFoundError instances to JSON
 */
public class NotFoundErrorDTO extends LJErrorDTO {

    public final String name;
    public final String kind;

    public NotFoundErrorDTO(NotFoundError error) {
        super("not-found-error", error);
        this.name = error.getName();
        this.kind = error.getKind();
    }

    public static NotFoundErrorDTO from(NotFoundError error) {
        return new NotFoundErrorDTO(error);
    }
}
