# Follow object states

```java
@StateSet({"open", "closed"})
class MyFile {
    @StateRefinement(to = "open(this)")
    MyFile() {}

    @StateRefinement(from = "open(this)", to = "closed(this)")
    void close() {}
}
```

The **State Machine** tab visualizes the declared states and method transitions. Here, construction establishes `open`, and `close()` requires `open` and establishes `closed`.

Use **Expand Conditions** to inspect preconditions and postconditions. On a state error, **View error on state machine** connects the diagnostic to the diagram. Files without state annotations may have no diagram.
