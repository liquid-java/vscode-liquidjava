package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"open", "closed", "locked"})
public class NegationTransition {

    @StateRefinement(to="open(this)")
    public NegationTransition() {}

    // transition from all states except "locked" to "locked"
    @StateRefinement(from="!locked(this)", to="locked(this)")
    public void lock() {}
}
