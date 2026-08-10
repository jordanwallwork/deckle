<script lang="ts">
  import type { GameSetup, ProjectComponentRef, SetupValidationError } from '$lib/gamerunner';
  import StepList from './StepList.svelte';

  let {
    doc,
    components,
    errors
  }: {
    doc: GameSetup;
    components: ProjectComponentRef[];
    errors: SetupValidationError[];
  } = $props();
</script>

<div class="doc">
  <h2>Setup</h2>
  <p class="doc-sub">Before the first turn, do the following in order:</p>
  <StepList list={doc.setup} basePath="setup" {doc} {components} {errors} />
</div>

<style>
  .doc {
    max-width: 820px;
    margin: 0 auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    padding: 2rem 2.5rem 2.5rem;
    font-size: 1rem;
    line-height: 1.9;
    color: var(--color-text-primary);
  }
  h2 {
    margin: 0 0 0.2rem;
    font-size: 1.5rem;
  }
  .doc-sub {
    margin: 0 0 1rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
