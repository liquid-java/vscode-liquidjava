package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"ready", "done"})
public class PostConditionFiltering {

    @StateRefinement(to="ready(this)")
    public PostConditionFiltering() {}

    @StateRefinement(from="ready(this)", to="flag && done(this)")
    public void finish(boolean flag) {}
}
