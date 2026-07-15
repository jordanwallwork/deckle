<!--
  PROTOTYPE — throwaway (wayfinder ticket #105).
  Three variants of the graphical setup-rules editor (sentence-builder paradigm),
  switchable via ?variant= on this dev-only route. All variants edit the SAME
  in-memory DSL AST — switch variants and your edits follow; the JSON panel below
  is the live serialized form.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { treeErrorCount } from './_components/dsl';
  import { editor, resetSample } from './_components/state.svelte';
  import PrototypeSwitcher from './_components/PrototypeSwitcher.svelte';
  import VariantA from './_components/VariantA.svelte';
  import VariantB from './_components/VariantB.svelte';
  import VariantC from './_components/VariantC.svelte';

  const variants = [
    { key: 'A', name: 'Sentence cards' },
    { key: 'B', name: 'Rulebook outline' },
    { key: 'C', name: 'List + inspector' }
  ];

  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
  const errorCount = $derived(treeErrorCount(editor.program));
</script>

<svelte:head>
  <title>PROTOTYPE — setup rules editor</title>
</svelte:head>

<div class="proto-page">
  <div class="banner">
    <strong>PROTOTYPE</strong> — throwaway setup-rules editor (wayfinder
    <a href="https://github.com/jordanwallwork/deckle/issues/105">#105</a>). Sample game: 2 players deal
    4 each, otherwise 3 each; flip top card to the market. One step is deliberately broken to show error
    styling.
    <span class="spacer"></span>
    {#if errorCount > 0}
      <span class="err-count">⚠ {errorCount} problem{errorCount === 1 ? '' : 's'}</span>
    {:else}
      <span class="ok">✓ setup is valid</span>
    {/if}
    <button class="reset" onclick={resetSample}>Reset sample</button>
  </div>

  {#if variant === 'B'}
    <VariantB />
  {:else if variant === 'C'}
    <VariantC />
  {:else}
    <VariantA />
  {/if}

  <details class="ast">
    <summary>Live DSL AST (the editor state <em>is</em> this JSON)</summary>
    <pre>{JSON.stringify(editor.program, null, 2)}</pre>
  </details>

  <PrototypeSwitcher {variants} current={variant} />
</div>

<style>
  .proto-page {
    flex: 1;
    background: var(--color-bg-primary);
    padding-bottom: 5rem;
  }

  .banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    background: var(--color-warning-bg);
    border-bottom: 1px solid var(--color-warning-border);
    color: var(--color-warning-fg);
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
  }

  .banner a {
    color: inherit;
  }

  .spacer {
    flex: 1;
  }

  .err-count {
    color: var(--color-danger);
    font-weight: 600;
  }

  .ok {
    color: var(--color-sage-dark);
    font-weight: 600;
  }

  .reset {
    border: 1px solid var(--color-warning-border);
    background: none;
    color: inherit;
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.6rem;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .ast {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 1rem 2rem;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .ast summary {
    cursor: pointer;
    user-select: none;
  }

  .ast pre {
    background: var(--color-dark);
    color: #d7e0d9;
    border-radius: var(--radius-md);
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.78rem;
    line-height: 1.5;
  }
</style>
