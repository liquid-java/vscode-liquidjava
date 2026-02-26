export const SERVER_JAR = "language-server-liquidjava.jar";
export const JAVA_BINARY = "java";
export const DEBUG_MODE = false;
export const DEBUG_PORT = 50000;
export const SELECTION_DEBOUNCE_MS = 250;
export const LIQUIDJAVA_SCOPES = [
    "source.liquidjava keyword.other.liquidjava",
    "source.liquidjava entity.name.function.liquidjava",
    "source.liquidjava storage.type.primitive.liquidjava",
    "source.liquidjava entity.name.type.liquidjava",
    "source.liquidjava entity.name.type.class.liquidjava",
    "source.liquidjava entity.name.type.externalref.liquidjava",
    "source.liquidjava variable.other.liquidjava",
    "source.liquidjava keyword.operator.liquidjava",
    "source.liquidjava constant.language.boolean.liquidjava",
    "source.liquidjava constant.numeric.liquidjava",
    "keyword.operator.liquidjava",
    "constant.language.boolean.liquidjava",
    "constant.numeric.liquidjava",
];
export const LIQUIDJAVA_ANNOTATIONS = [
    "Refinement",
    "RefinementAlias",
    "RefinementPredicate",
    "StateSet",
    "Ghost",
    "StateRefinement",
    "ExternalRefinementsFor",
]
export const LIQUIDJAVA_ANNOTATION_START = new RegExp(`@(liquidjava\\.specification\\.)?(${LIQUIDJAVA_ANNOTATIONS.join("|")})\\s*\\(`, "g");