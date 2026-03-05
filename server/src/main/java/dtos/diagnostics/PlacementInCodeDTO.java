package dtos.diagnostics;

import liquidjava.processor.context.PlacementInCode;

/**
 * DTO for serializing PlacementInCode instances to JSON
 */
public record PlacementInCodeDTO(String text, SourcePositionDTO position) {

    public static PlacementInCodeDTO from(PlacementInCode placement) {
        if (placement == null)
            return null;
        return new PlacementInCodeDTO(placement.getText(), SourcePositionDTO.from(placement.getPosition()));
    }
}
