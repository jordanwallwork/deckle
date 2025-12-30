<script lang="ts">
  import type { Border, BorderStyle } from "../types";

  let {
    border,
    onchange,
  }: {
    border?: Border;
    onchange: (newBorder: Border) => void;
  } = $props();

  // Track whether we're in "separate sides" mode
  let separateSides = $state(
    !!(border?.top || border?.right || border?.bottom || border?.left)
  );

  const borderStyleOptions: Array<{ value: BorderStyle; label: string }> = [
    { value: "none", label: "None" },
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
    { value: "dotted", label: "Dotted" },
    { value: "double", label: "Double" },
  ];

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

  function updateRadius(radius: number | undefined) {
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
    <div class="border-row">
      <span class="side-label">All sides</span>
      <input
        type="color"
        class="color-picker"
        value={border?.color ?? "#000000"}
        oninput={(e) => updateAllSides({ color: e.currentTarget.value })}
      />
      <div class="width-input">
        <input
          type="number"
          min="0"
          value={border?.width ?? ""}
          placeholder="0"
          oninput={(e) =>
            updateAllSides({ width: parseInt(e.currentTarget.value) || 0 })}
        />
        <span class="unit">px</span>
      </div>
      <select
        value={border?.style ?? "solid"}
        onchange={(e) =>
          updateAllSides({ style: e.currentTarget.value as BorderStyle })}
      >
        {#each borderStyleOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  {:else}
    <!-- Separate sides mode -->
    {#each [{ key: "top", label: "Top" }, { key: "right", label: "Right" }, { key: "bottom", label: "Bottom" }, { key: "left", label: "Left" }] as { key, label }}
      <div class="border-row">
        <span class="side-label">{label}</span>
        <input
          type="color"
          class="color-picker"
          value={border?.[key]?.color ?? "#000000"}
          oninput={(e) => updateSide(key, { color: e.currentTarget.value })}
        />
        <div class="width-input">
          <input
            type="number"
            min="0"
            value={border?.[key]?.width ?? ""}
            placeholder="0"
            oninput={(e) =>
              updateSide(key, { width: parseInt(e.currentTarget.value) || 0 })}
          />
          <span class="unit">px</span>
        </div>
        <select
          value={border?.[key]?.style ?? "solid"}
          onchange={(e) =>
            updateSide(key, { style: e.currentTarget.value as BorderStyle })}
        >
          {#each borderStyleOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    {/each}
  {/if}

  <!-- Border radius -->
  <div class="radius-input">
    <label for="border-radius">Border radius:</label>
    <div class="radius-control">
      <input
        type="number"
        id="border-radius"
        min="0"
        value={typeof border?.radius === "number" ? border.radius : ""}
        placeholder="0"
        oninput={(e) =>
          updateRadius(parseInt(e.currentTarget.value) || undefined)}
      />
      <span class="unit">px</span>
    </div>
  </div>
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

  .border-row {
    display: grid;
    grid-template-columns: auto 50px 80px 1fr;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .side-label {
    font-size: 0.75rem;
    color: #666;
    min-width: 60px;
  }

  .color-picker {
    width: 50px;
    height: 36px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }

  .width-input {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .width-input input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
  }

  .width-input input[type="number"]:focus {
    outline: none;
    border-color: #0066cc;
  }

  .unit {
    font-size: 0.75rem;
    color: #666;
  }

  select {
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
    font-family: inherit;
  }

  select:focus {
    outline: none;
    border-color: #0066cc;
  }

  .radius-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .radius-input label {
    font-size: 0.75rem;
    color: #666;
    min-width: 90px;
  }

  .radius-control {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
  }

  .radius-control input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
  }

  .radius-control input[type="number"]:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
