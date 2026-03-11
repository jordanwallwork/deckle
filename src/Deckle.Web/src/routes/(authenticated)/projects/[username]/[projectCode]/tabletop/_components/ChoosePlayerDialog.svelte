<script lang="ts">
  interface Props {
    playerCount: number;
    onConfirm: (player: number) => void;
  }

  let { playerCount, onConfirm }: Props = $props();

  const players = $derived(
    Array.from({ length: playerCount }, (_, i) => i + 1)
  );
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="cpd-title">
  <div class="dialog">
    <h2 id="cpd-title">Who goes first?</h2>
    <p class="subtitle">Select the starting player.</p>
    <div class="options">
      {#each players as n (n)}
        <button class="player-btn" onclick={() => onConfirm(n)}>
          Player {n}
        </button>
      {/each}
    </div>
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
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .player-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
  }

  .player-btn:hover {
    background: #eff6ff;
    border-color: #3b82f6;
    color: #1d4ed8;
  }

  .player-btn:active {
    background: #dbeafe;
  }
</style>
