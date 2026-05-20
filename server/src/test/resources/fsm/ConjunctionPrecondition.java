package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"open", "closed"})
public class ConjunctionPrecondition {

    @StateRefinement(to="open(this)")
    public ConjunctionPrecondition() {}

    @StateRefinement(from="flag && open(this)", to="closed(this)")
    public void close(boolean flag) {}
}
