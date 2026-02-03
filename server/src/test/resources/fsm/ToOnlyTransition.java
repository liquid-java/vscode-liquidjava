package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"a", "b", "c"})
public class ToOnlyTransition {

    @StateRefinement(to="a(this)")
    public ToOnlyTransition() {}

    // all transitions to state c
    @StateRefinement(to="c(this)")
    public void action() {}
}
