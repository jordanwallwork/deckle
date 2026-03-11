<script lang="ts">
  interface Props {
    min: number;
    max: number;
    onConfirm: (count: number) => void;
  }

  let { min, max, onConfirm }: Props = $props();

  let selected = $state(min);

  const options = $derived(
    Array.from({ length: max - min + 1 }, (_, i) => min + i)
  );
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="pcd-title">
  <div class="dialog">
    <h2 id="pcd-title">How many players?</h2>
    <p class="subtitle">Select a number between {min} and {max}.</p>
    <div class="options">
      {#each options as n (n)}
        <button
          class="option-btn"
          class:selected={selected === n}
          onclick={() => (selected = n)}
        >
          {n}
        </button>
      {/each}
    </div>
    <button class="confirm-btn" onclick={() => onConfirm(selected)}>
      Confirm
    </button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    min-width: 280px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
  }

  .subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .options {
    display: flex;
    gap: 0.625rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .option-btn {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    border: 2px solid #e5e7eb;
    background: white;
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .option-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .option-btn.selected {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .confirm-btn {
    padding: 0.625rem 2rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .confirm-btn:hover {
    background: #2563eb;
  }
</style>
