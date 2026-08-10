<script lang="ts">
  import type { NodeKind } from '$lib/gamerunner';

  let {
    onAdd,
    label = '＋ add a step',
    variant = 'add'
  }: { onAdd: (kind: NodeKind) => void; label?: string; variant?: 'add' | 'insert' } = $props();

  const OPTIONS: { kind: NodeKind; label: string }[] = [
    { kind: 'placeSeats', label: 'Place seats' },
    { kind: 'placeZone', label: 'Place zone' },
    { kind: 'place', label: 'Place components' },
    { kind: 'shuffle', label: 'Shuffle' },
    { kind: 'deal', label: 'Deal' },
    { kind: 'move', label: 'Move' },
    { kind: 'flip', label: 'Flip' },
    { kind: 'roll', label: 'Roll dice' },
    { kind: 'when', label: 'If … (conditional)' },
    { kind: 'forEachSeat', label: 'For each seat…' }
  ];

  function pick(value: string) {
    const opt = OPTIONS.find((o) => o.kind === value);
    if (opt) onAdd(opt.kind);
  }
</script>

<select
  class="add-select {variant}"
  value=""
  onchange={(e) => {
    pick(e.currentTarget.value);
    e.currentTarget.value = '';
  }}
>
  <option value="" disabled selected>{label}</option>
  {#each OPTIONS as o (o.kind)}
    <option value={o.kind}>{o.label}</option>
  {/each}
</select>

<style>
  .add-select {
    appearance: none;
    border: none;
    background: none;
    font: inherit;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .add-select.add {
    font-size: 0.85rem;
    opacity: 0.7;
  }
  .add-select.insert {
    font-size: 0.72rem;
    color: var(--color-accent-fg);
  }
  .add-select:hover {
    opacity: 1;
    color: var(--color-accent-fg-hover);
  }
</style>
