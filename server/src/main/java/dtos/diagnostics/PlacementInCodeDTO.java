package dtos.diagnostics;

import liquidjava.processor.context.PlacementInCode;

/**
 * DTO for serializing PlacementInCode instances to JSON
 */
public record PlacementInCodeDTO(String text, PositionDTO position) {

    public static PlacementInCodeDTO from(PlacementInCode placement) {
        if (placement == null)
            return null;
        return new PlacementInCodeDTO(placement.getText(), PositionDTO.from(placement.getPosition()));
    }
}
