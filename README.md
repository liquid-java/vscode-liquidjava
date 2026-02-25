# LiquidJava VS Code Extension

![](https://raw.githubusercontent.com/liquid-java/liquidjava/refs/heads/main/docs/design/figs/banner.gif)

### Extend your Java code with Liquid Types and catch bugs earlier!

[LiquidJava](https://github.com/liquid-java/liquidjava) is an additional type checker for Java, based on **liquid types** and **typestates**, which provides stronger safety guarantees to Java programs at compile-time. With this extension, you can use LiquidJava directly in VS Code, with real-time diagnostic reporting, syntax highlighting for refinements, and an interactive webview for displaying details about diagnostics and state machine diagrams.

```java
@Refinement("a > 0")
int a = 3; // okay
a = -8; // type error!
```

### Installation

To try out the extension, install it from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AlcidesFonseca.liquid-java) or the [Open VSX Marketplace](https://open-vsx.org/extension/AlcidesFonseca/liquid-java). Additionally, you'll need the [Language Support for Java(TM) by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.java) VS Code extension, and add the `liquidjava-api` dependency to your Java project:

#### Maven
```xml
<dependency>
    <groupId>io.github.liquid-java</groupId>
    <artifactId>liquidjava-api</artifactId>
    <version>0.0.4</version>
</dependency>
```

#### Gradle
```groovy
repositories {
    mavenCentral()
}

dependencies {
    implementation 'io.github.liquid-java:liquidjava-api:0.0.4'
}
```

A repository with LiquidJava examples is available at [liquidjava-examples](https://github.com/liquid-java/liquidjava-examples). You can try them out without setting up your local environment using [GitHub Codespaces](https://codespaces.new/liquid-java/liquidjava-examples).

### What are Liquid Types?

Liquid types extend a language with **logical predicates** over the basic types. They allow developers to restrict the values that a variable, parameter or return value can have. These kinds of constraints help to catch more bugs before the program is executed. For example, they allow us to prevent bugs like array index out-of-bounds or division by zero at compile-time.

### LiquidJava

#### Refinements

To refine a variable, field, parameter or return value, use the `@Refinement` annotation with a predicate as an argument. The predicate must be a boolean expression that uses the name of the variable being refined (or `_`) to refer to its value. You can also provide a custom message to be included in the error message when the refinement is violated. Some examples include:

```java
@Refinement("x > 0") // x must be greater than 0
int x;

@Refinement("0 <= _ && _ <= 100") // y must be between 0 and 100
int y;

@Refinement(value="z % 2 == 0 ? z >= 0 : z < 0", msg="z must be positive if even, negative if odd")
int z;

@Refinement("_ >= 0")
int absDiv(int a, @Refinement(value="b != 0", msg="cannot divide by zero") int b) {
    int res = a / b;
    return res >= 0 ? res : -res;
}
```

#### Refinement Aliases

To simplify the usage of refinements, you can create **predicate aliases** using the `@RefinementAlias` annotation, and apply them inside other refinements:

```java
@RefinementAlias("Percentage(int v) { 0 <= v && v <= 100 }")
public class MyClass {

    // x must be between 0 and 100
    @Refinement("Percentage(x)")
    int x = 25;
}
```

#### Object State Modeling via Typestates

Beyond basic refinements, LiquidJava also supports **object state modeling** via typestates, which allows developers to specify when a method can or cannot be called based on the state of the object. You can also provide a custom error message for when the method precondition is violated. For example:

```java
@StateSet({"open", "closed"})
public class MyFile {

    @StateRefinement(to="open(this)")
    public MyFile() {}

    @StateRefinement(from="open(this)", msg="file must be open to read")
    public void read() {}

    @StateRefinement(from="open(this)", to="closed(this)", msg="file must be open to close")
    public void close() {}
}

MyFile f = new MyFile();
f.read();
f.close();
f.read(); // type error: file must be open to read
```

#### Ghost Variables and External Refinements

Finally, LiquidJava also provides **ghost variables**, which are used to track additional information about the program state when typestates aren't enough, with the `@Ghost` annotation. Additionally, you can also refine external libraries using the `@ExternalRefinementsFor` annotation. Here is an example of the `java.util.Stack` class refined with LiquidJava, using a `size` ghost variable to track the number of elements in the stack:

```java
@ExternalRefinementsFor("java.util.Stack")
@Ghost("int size")
public interface StackRefinements<E> {

	public void Stack();

	@StateRefinement(to="size(this) == size(old(this)) + 1") // increments size by 1
	public boolean push(E elem);

	@StateRefinement(from="size(this) > 0", to="size(this) == size(old(this)) - 1", msg="cannot pop from an empty stack") // decrements size by 1
	public E pop();

	@StateRefinement(from="size(this) > 0", msg="cannot peek from an empty stack")
	public E peek();
}

Stack<String> s = new Stack<>();
s.push("hello");
s.pop();
s.pop(); // type error: cannot pop from an empty stack

```

You can find more examples of how to use LiquidJava on the [LiquidJava Website](https://liquid-java.github.io). To learn how to use LiquidJava, you can also follow the [LiquidJava tutorial](https://github.com/liquid-java/liquidjava-tutorial).

For more information, check the following repositories:
- [liquidjava](https://github.com/liquid-java/liquidjava): Includes the API, verifier and some examples
- [vscode-liquidjava](https://github.com/liquid-java/vscode-liquidjava): Source code of this VS Code extension
- [liquidjava-examples](https://github.com/liquid-java/liquidjava-examples): Examples of how to use LiquidJava
- [liquid-java-external-libs](https://github.com/liquid-java/liquid-java-external-libs): Examples of how to use LiquidJava to refine external libraries