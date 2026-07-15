// Game runner: setup DSL types, validation, blueprint instantiation, and
// (future) interpreter.
export * from './types';
export { validateGameSetup } from './validate';
export { placeZone, instantiateBlueprint, type PlacedZone } from './instantiate';
