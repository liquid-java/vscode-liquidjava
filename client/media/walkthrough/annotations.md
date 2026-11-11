## Maven — `pom.xml`

```xml
<dependency>
    <groupId>io.github.liquid-java</groupId>
    <artifactId>liquidjava-api</artifactId>
    <version>0.0.8</version>
</dependency>
```

## Gradle — `build.gradle`

```groovy
repositories {
    mavenCentral()
}

dependencies {
    implementation 'io.github.liquid-java:liquidjava-api:0.0.8'
}
```

Reload your Java project after changing dependencies. Import annotations from `liquidjava.specification`, for example `liquidjava.specification.Refinement`.
