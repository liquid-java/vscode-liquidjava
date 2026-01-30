package fsm;

import liquidjava.specification.ExternalRefinementsFor;
import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@ExternalRefinementsFor("com.example.Connection")
@StateSet({"connected", "disconnected"})
public interface ExternalRefinements {

    @StateRefinement(to="disconnected(this)")
    void Connection();

    @StateRefinement(from="disconnected(this)", to="connected(this)")
    void connect();
}
