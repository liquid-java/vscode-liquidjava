package inherited;

import liquidjava.specification.ExternalRefinementsFor;
import liquidjava.specification.StateRefinement;

// the state set is declared in the superclass's spec, in another file
@ExternalRefinementsFor("java.awt.Frame")
public interface FrameRefinements {
    @StateRefinement(to = "notDisplayable(this)")
    void Frame(String title);

    @StateRefinement(from = "notDisplayable(this)")
    void setUndecorated(boolean undecorated);
}
