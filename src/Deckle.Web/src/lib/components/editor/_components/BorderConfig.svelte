<script lang="ts">
  import type { Border, BorderStyle } from "../types";
  import BorderSideControl from "./BorderSideControl.svelte";
  import DimensionInput from "./DimensionInput.svelte";

  let {
    border,
    onchange,
  }: {
    border?: Border;
    onchange: (newBorder: Border) => void;
  } = $props();

  // Convert number to string format for DimensionInput
  function toStringValue(value: number | string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value;
  }

  // Track whether we're in "separate sides" mode
  let separateSides = $state(
    !!(border?.top || border?.right || border?.bottom || border?.left)
  );

  function toggleSeparateSides() {
    separateSides = !separateSides;

    if (!separateSides) {
      // Switching to "all sides" mode - use first defined side or defaults
      const firstSide =
        border?.top || border?.right || border?.bottom || border?.left;
      onchange({
        ...border,
        width: firstSide?.width ?? border?.width,
        style: firstSide?.style ?? border?.style,
        color: firstSide?.color ?? border?.color,
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined,
      });
    } else {
      // Switching to "separate sides" mode - copy from main properties to all sides
      const width = border?.width;
      const style = border?.style;
      const color = border?.color;

      onchange({
        ...border,
        width: undefined,
        style: undefined,
        color: undefined,
        top: { width, style, color },
        right: { width, style, color },
        bottom: { width, style, color },
        left: { width, style, color },
      });
    }
  }

  function updateAllSides(updates: {
    width?: number;
    style?: BorderStyle;
    color?: string;
  }) {
    // Ensure style defaults to "solid" if not already set
    const style = updates.style ?? border?.style ?? "solid";

    onchange({
      ...border,
      ...updates,
      style,
    });
  }

  function updateSide(
    side: "top" | "right" | "bottom" | "left",
    updates: { width?: number; style?: BorderStyle; color?: string }
  ) {
    // Ensure style defaults to "solid" if not already set
    const style = updates.style ?? border?.[side]?.style ?? "solid";

    onchange({
      ...border,
      [side]: {
        ...border?.[side],
        ...updates,
        style,
      },
    });
  }

  function updateRadius(radius: number | string | undefined) {
    onchange({
      ...border,
      radius,
    });
  }
</script>

<div class="border-config">
  <div class="header">
    <label class="section-label">Border:</label>
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
    <BorderSideControl
      label="All sides"
      width={border?.width}
      style={border?.style}
      color={border?.color}
      onchange={updateAllSides}
    />
  {:else}
    <!-- Separate sides mode -->
    {#each [{ key: "top", label: "Top" }, { key: "right", label: "Right" }, { key: "bottom", label: "Bottom" }, { key: "left", label: "Left" }] as { key, label }}
      <BorderSideControl
        {label}
        width={border?.[key]?.width}
        style={border?.[key]?.style}
        color={border?.[key]?.color}
        onchange={(updates) => updateSide(key, updates)}
      />
    {/each}
  {/if}

  <!-- Border radius -->
  <DimensionInput
    label="Border radius"
    id="border-radius"
    value={toStringValue(typeof border?.radius === 'object' ? undefined : border?.radius)}
    onchange={(value) => updateRadius(value)}
  />
</div>

<style>
  .border-config {
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
</style>
