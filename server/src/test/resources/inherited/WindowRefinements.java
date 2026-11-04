package inherited;

import liquidjava.specification.ExternalRefinementsFor;
import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"displayable", "notDisplayable"})
@ExternalRefinementsFor("java.awt.Window")
public interface WindowRefinements {
    @StateRefinement(to = "notDisplayable(this)")
    void dispose();

    @StateRefinement(to = "displayable(this)")
    void pack();
}
