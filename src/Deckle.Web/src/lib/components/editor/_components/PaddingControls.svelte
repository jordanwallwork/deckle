<script lang="ts">
  import DimensionInput from './DimensionInput.svelte';

  type Padding = {
    all?: number | string;
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  };

  let {
    padding,
    onchange,
  }: {
    padding?: Padding;
    onchange: (newPadding: Padding) => void;
  } = $props();

  // Convert number to string format for DimensionInput
  function toStringValue(value: number | string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value;
  }

  // Track whether we're in "separate sides" mode
  let separateSides = $state(
    !!(
      padding?.top !== undefined ||
      padding?.right !== undefined ||
      padding?.bottom !== undefined ||
      padding?.left !== undefined
    )
  );

  function toggleSeparateSides() {
    separateSides = !separateSides;

    if (!separateSides) {
      // Switching to "all sides" mode - use first defined side or default
      const allValue =
        padding?.top ??
        padding?.right ??
        padding?.bottom ??
        padding?.left ??
        padding?.all;
      onchange({
        all: allValue,
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined,
      });
    } else {
      // Switching to "separate sides" mode - copy from all to individual sides
      const value = padding?.all;
      onchange({
        all: undefined,
        top: value,
        right: value,
        bottom: value,
        left: value,
      });
    }
  }

  function updateAllSides(value: number | string | undefined) {
    onchange({
      ...padding,
      all: value,
    });
  }

  function updateSide(
    side: "top" | "right" | "bottom" | "left",
    value: number | string | undefined
  ) {
    onchange({
      ...padding,
      [side]: value,
    });
  }
</script>

<div class="field">
  <div class="header">
    <label class="section-label">Padding:</label>
    <label class="toggle-label">
      <span>Separate sides</span>
      <input
        type="checkbox"
        checked={separateSides}
        onchange={toggleSeparateSides}
      />
    </label>
  </div>

  {#if !separateSides}
    <!-- All sides mode -->
    <DimensionInput
      label="All sides"
      id="padding-all"
      value={toStringValue(padding?.all)}
      onchange={(value) => updateAllSides(value)}
    />
  {:else}
    <!-- Separate sides mode -->
    <div class="padding-grid">
      <DimensionInput
        label="Top"
        id="padding-top"
        value={toStringValue(padding?.top)}
        onchange={(value) => updateSide("top", value)}
      />

      <DimensionInput
        label="Right"
        id="padding-right"
        value={toStringValue(padding?.right)}
        onchange={(value) => updateSide("right", value)}
      />

      <DimensionInput
        label="Bottom"
        id="padding-bottom"
        value={toStringValue(padding?.bottom)}
        onchange={(value) => updateSide("bottom", value)}
      />

      <DimensionInput
        label="Left"
        id="padding-left"
        value={toStringValue(padding?.left)}
        onchange={(value) => updateSide("left", value)}
      />
    </div>
  {/if}
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #666;
    cursor: pointer;
  }

  .toggle-label input[type="checkbox"] {
    cursor: pointer;
    width: 36px;
    height: 20px;
    appearance: none;
    background: #ccc;
    border-radius: 10px;
    position: relative;
    transition: background 0.2s;
  }

  .toggle-label input[type="checkbox"]:checked {
    background: #0066cc;
  }

  .toggle-label input[type="checkbox"]::before {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: 2px;
    transition: left 0.2s;
  }

  .toggle-label input[type="checkbox"]:checked::before {
    left: 18px;
  }

  .padding-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .padding-grid :global(.field) {
    margin-bottom: 0;
  }
</style>
