<script lang="ts">
  import {
    CARD_SIZES,
    DICE_COLORS,
    DICE_TYPES,
    DICE_STYLES,
  } from "$lib/constants";
  import { Card, Button } from "$lib/components";
  import type { GameComponent } from "$lib/types";

  let {
    component,
    onEdit,
    onDelete,
    onLinkDataSource,
  }: {
    component: GameComponent;
    onEdit?: (component: GameComponent) => void;
    onDelete?: (component: GameComponent) => void;
    onLinkDataSource?: (component: GameComponent) => void;
  } = $props();
</script>

<Card>
  <div class="card-header">
    <h3>{component.name}</h3>
    <div class="card-actions">
      {#if onEdit}
        <Button
          variant="icon"
          class="edit-button"
          onclick={() => onEdit(component)}
        >
          {#snippet icon()}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          {/snippet}
        </Button>
      {/if}
      {#if onDelete}
        <Button
          variant="icon"
          class="delete-button"
          onclick={() => onDelete(component)}
        >
          {#snippet icon()}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          {/snippet}
        </Button>
      {/if}
    </div>
  </div>
  {#if component.type === "Dice"}
    <div class="dice-info">
      <p class="component-type">
        {DICE_TYPES.find((t) => t.value === component.diceType)?.label ||
          component.diceType}
        • {DICE_STYLES.find((s) => s.value === component.diceStyle)?.label ||
          component.diceStyle}
      </p>
      <p class="dice-number">Quantity: {component.diceNumber}</p>
      <div class="dice-color-display">
        <span
          class="color-indicator"
          style="background-color: {DICE_COLORS.find(
            (c) => c.value === component.diceBaseColor
          )?.hex}"
          title={DICE_COLORS.find((c) => c.value === component.diceBaseColor)
            ?.label}
        ></span>
        <span class="color-name"
          >{DICE_COLORS.find((c) => c.value === component.diceBaseColor)
            ?.label}</span
        >
      </div>
    </div>
  {:else if component.type === "Card"}
    <p class="component-type">
      Card • {CARD_SIZES.find((s) => s.value === component.size)?.label ||
        component.size}
    </p>
    <div class="design-links" style:margin-top="0.5rem">
      <a
        href="/projects/{component.projectId}/components/{component.id}/front"
        class="design-link"
      >
        Edit Front
      </a>
      <span class="design-link-separator">•</span>
      <a
        href="/projects/{component.projectId}/components/{component.id}/back"
        class="design-link"
      >
        Edit Back
      </a>
      <span class="design-link-separator">•</span>
      <a
        href="/projects/{component.projectId}/components/{component.id}/export"
        class="design-link"
      >
        Export
      </a>
    </div>
    <div class="design-links">
      <span class="design-link">
        Data Source:
        {#if component.dataSource}
          <a
            href="/projects/{component.projectId}/data-sources/{component
              .dataSource.id}"
            class="design-link">{component.dataSource.name}</a
          >
        {:else}
          None
        {/if}
        {#if onLinkDataSource}
          <Button
            variant="text"
            size="sm"
            onclick={() => onLinkDataSource(component)}
          >
            ({component.dataSource ? "Change" : "Link"})
          </Button>
        {/if}
      </span>
    </div>
  {:else}
    <p class="component-type">Component</p>
  {/if}
</Card>

<style>
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0;
    flex: 1;
  }

  .card-actions {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }

  :global(.edit-button) {
    color: var(--color-muted-teal) !important;
  }

  :global(.edit-button:hover) {
    background-color: var(--color-teal-grey) !important;
    color: var(--color-sage) !important;
  }

  :global(.delete-button) {
    color: #d32f2f !important;
  }

  :global(.delete-button:hover) {
    background-color: #ffebee !important;
    color: #b71c1c !important;
  }

  .component-type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0;
  }

  .dice-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dice-number {
    font-size: 0.875rem;
    color: var(--color-sage);
    font-weight: 500;
    margin: 0;
  }

  .dice-color-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-indicator {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid var(--color-teal-grey);
    flex-shrink: 0;
  }

  .color-name {
    font-size: 0.875rem;
    color: var(--color-sage);
    font-weight: 500;
  }

  .design-links {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: center;
  }

  .design-link,
  .design-link-separator {
    display: inline-block;
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .design-link > a,
  a.design-link {
    font-weight: 500;
  }

  .design-link > a:hover,
  a.design-link:hover {
    color: var(--color-sage);
    text-decoration: underline;
  }
</style>
