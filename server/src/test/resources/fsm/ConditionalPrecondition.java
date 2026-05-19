package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"left", "right", "done"})
public class ConditionalPrecondition {

    @StateRefinement(to="left(this)")
    public ConditionalPrecondition() {}

    @StateRefinement(from="flag ? left(this) : right(this)", to="done(this)")
    public void finish(boolean flag) {}
}
