package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"on", "off"})
public class ConditionalTransition {

    // include transitions of both branches
    @StateRefinement(to="flag ? on(this) : off(this)")
    public ConditionalTransition(boolean flag) {}

    @StateRefinement(from="off(this)", to="on(this)")
    public void turnOn() {}

    @StateRefinement(from="on(this)", to="off(this)")
    public void turnOff() {}
}
