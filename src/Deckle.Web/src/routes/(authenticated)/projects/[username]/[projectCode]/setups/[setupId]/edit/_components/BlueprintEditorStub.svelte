<script lang="ts">
  // Placeholder for the Blueprint editor — the SECOND switchable view of this
  // page, built by #122. It shares this page's single document + save state
  // (decision #111): the setup-script view and the blueprint view edit the same
  // in-memory GameSetup and Save persists both. #122 replaces this stub with the
  // single-seat blueprint canvas; the view-switch shell and the shared document
  // are already in place here.
  import type { GameSetup } from '$lib/gamerunner';

  let { doc }: { doc: GameSetup } = $props();
</script>

<div class="stub">
  <h2>Blueprint editor</h2>
  <p class="tag">Coming in #122</p>
  <p>
    This view will let you author zone blueprints (seat / table / edge bundles) on a single-seat
    canvas. It shares this page's document and Save button — no separate persistence.
  </p>
  <p class="count">
    This setup currently defines {doc.blueprints.length} blueprint{doc.blueprints.length === 1
      ? ''
      : 's'}.
  </p>
</div>

<style>
  .stub {
    max-width: 820px;
    margin: 0 auto;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2.5rem;
    color: var(--color-text-primary);
    text-align: center;
  }
  h2 {
    margin: 0 0 0.25rem;
  }
  .tag {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-accent-fg);
    background: color-mix(in srgb, var(--color-sage) 18%, transparent);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    margin: 0 0 1rem;
  }
  .count {
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
</style>
