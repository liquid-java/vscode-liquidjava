import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet(name = "phase", value = {"open", "closed"})
class Door {
    @StateRefinement(to = "phase(this) == open")
    Door() {}

    @StateRefinement(from = "phase(this) == open", to = "phase(this) == closed")
    void close() {}

    static void use() {
        Door door = new Door();
        int[] keys = new int[2];
    }
}
