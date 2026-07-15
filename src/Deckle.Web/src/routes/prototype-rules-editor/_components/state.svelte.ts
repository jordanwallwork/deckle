// PROTOTYPE — throwaway (wayfinder ticket #105).
// Shared editor state: the state IS the DSL AST. All three variants mutate this
// same object, so edits survive switching variants and the JSON panel is live.
import { sampleProgram, type Step } from './dsl';

export const editor = $state<{ program: Step[] }>({ program: sampleProgram() });

export function resetSample() {
  editor.program = sampleProgram();
}
