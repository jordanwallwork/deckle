<!-- PROTOTYPE — throwaway (wayfinder ticket #109). Floating variant switcher. -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  let { variants, current }: { variants: { key: string; name: string }[]; current: string } = $props();

  const index = $derived(Math.max(0, variants.findIndex((v) => v.key === current)));

  function go(offset: number) {
    const next = variants[(index + offset + variants.length) % variants.length];
    const url = new URL(page.url);
    url.searchParams.set('variant', next.key);
    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('input, textarea, select, [contenteditable]') !== null)) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="switcher">
  <button onclick={() => go(-1)} aria-label="Previous variant">←</button>
  <span class="label">{variants[index].key} — {variants[index].name}</span>
  <button onclick={() => go(1)} aria-label="Next variant">→</button>
</div>

<style>
  .switcher {
    position: fixed;
    bottom: 1.2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--color-dark);
    color: white;
    border-radius: 999px;
    padding: 0.45rem 0.8rem;
    box-shadow: var(--shadow-lg);
    font-size: 0.85rem;
  }

  .label {
    min-width: 11rem;
    text-align: center;
    font-weight: 600;
  }

  button {
    border: none;
    background: rgba(255, 255, 255, 0.12);
    color: white;
    border-radius: 999px;
    width: 1.8rem;
    height: 1.8rem;
    cursor: pointer;
    font-size: 0.9rem;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.28);
  }
</style>
