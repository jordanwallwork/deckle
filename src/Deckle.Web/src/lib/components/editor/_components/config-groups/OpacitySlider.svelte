<script lang="ts">
  /**
   * Opacity slider (0–1) with a numeric readout. Continuous drags collapse into
   * one undo step via the edit session (ADR-0001 D7): each input carries the
   * session key; the caller seals on pointer-up.
   */
  let {
    value,
    placeholder = 1,
    sessionKey,
    onchange,
    onseal
  }: {
    value: number | undefined;
    placeholder?: number;
    sessionKey: string;
    onchange: (value: number, sessionKey: string) => void;
    onseal: () => void;
  } = $props();

  const shown = $derived(value ?? placeholder);
  const pct = $derived(Math.round(shown * 100));
</script>

<div class="opacity-slider">
  <input
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={shown}
    oninput={(e) => onchange(Number.parseFloat(e.currentTarget.value), sessionKey)}
    onpointerup={onseal}
    onkeyup={onseal}
    onblur={onseal}
    aria-label="Opacity"
  />
  <span class="readout">{pct}%</span>
</div>

<style>
  .opacity-slider {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .opacity-slider input[type='range'] {
    flex: 1;
    min-width: 0;
  }

  .readout {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    min-width: 2.75rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
