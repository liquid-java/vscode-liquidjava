import liquidjava.specification.Refinement;

class Negate {
    void negate() {
        @Refinement("_ > 0")
        int b = 8;
        b = -b;
    }
}
