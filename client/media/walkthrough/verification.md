# Verify refinements

```java
@Refinement("_ > 0")
int count = 3;
count = -1; // refinement error
```

The refinement restricts `count` to positive values. LiquidJava rejects the assignment of `-1` at verification time.

Open or save the Java file to verify it, or run **LiquidJava: Verify** from the Command Palette. Check the LiquidJava status bar for the result.

Use the installation instructions in the extension's README to add `liquidjava-api` to your project. If the verifier is stopped, run **LiquidJava: Start**.
