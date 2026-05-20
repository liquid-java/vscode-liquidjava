package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"ready", "done", "error"})
public class ConditionalPostCondition {

    @StateRefinement(to="ready(this)")
    public ConditionalPostCondition() {}

    @StateRefinement(from="ready(this)", to="flag ? done(this) : error(this)")
    public void finish(boolean flag) {}
}
