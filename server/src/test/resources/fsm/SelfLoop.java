package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"idle", "running"})
public class SelfLoop {

    @StateRefinement(to="idle(this)")
    public SelfLoop() {}

    // explicit self-loop
    @StateRefinement(from="running(this)", to="running(this)")
    public void tick() {}

    // implicit self-loop
    @StateRefinement(from="idle(this)")
    public void noop() {}

    // transition to another state
    @StateRefinement(from="idle(this)", to="running(this)")
    public void start() {}
}
