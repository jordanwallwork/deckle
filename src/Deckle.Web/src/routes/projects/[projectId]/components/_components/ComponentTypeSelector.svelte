<script lang="ts">
  let {
    onSelectType,
  }: {
    onSelectType: (type: "card" | "dice" | "playermat") => void;
  } = $props();
</script>

<div class="type-selection">
  <button class="type-card" onclick={() => onSelectType("card")}>
    <div class="type-icon">🃏</div>
    <h4>Card</h4>
    <p>Create custom playing cards, game cards, or card decks</p>
  </button>
  <button class="type-card" onclick={() => onSelectType("dice")}>
    <div class="type-icon">🎲</div>
    <h4>Dice</h4>
    <p>Design custom dice with various colors and styles</p>
  </button>
  <button class="type-card" onclick={() => onSelectType("playermat")}>
    <div class="type-icon">📋</div>
    <h4>Player Mat</h4>
    <p>Create player boards, mats, or large play surfaces</p>
  </button>
</div>

<style>
  .type-selection {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .type-card {
    background-color: white;
    border: 2px solid var(--color-teal-grey-light);
    border-radius: 8px;
    padding: 2rem 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .type-card:hover {
    border-color: var(--color-muted-teal);
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(120, 160, 131, 0.2);
  }

  .type-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .type-card h4 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 0.5rem 0;
  }

  .type-card p {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0;
    line-height: 1.4;
  }
</style>
