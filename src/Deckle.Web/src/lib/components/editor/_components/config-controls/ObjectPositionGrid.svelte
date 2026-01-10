<script lang="ts">
  type PositionX = "left" | "center" | "right";
  type PositionY = "top" | "center" | "bottom";

  let {
    value = "center center",
    onchange,
  }: {
    value?: string;
    onchange: (position: string) => void;
  } = $props();

  // Parse current value into x and y components
  const parsePosition = (pos: string): { x: PositionX; y: PositionY } => {
    const normalized = pos.trim().toLowerCase();

    // Handle various CSS object-position formats
    if (normalized === "center" || normalized === "50% 50%") {
      return { x: "center", y: "center" };
    }

    // Split by space and parse
    const parts = normalized.split(/\s+/);
    let x: PositionX = "center";
    let y: PositionY = "center";

    // First part is horizontal (x)
    if (parts[0]) {
      if (parts[0].includes("left") || parts[0] === "0%" || parts[0] === "0") {
        x = "left";
      } else if (parts[0].includes("right") || parts[0] === "100%") {
        x = "right";
      } else {
        x = "center";
      }
    }

    // Second part is vertical (y)
    if (parts[1]) {
      if (parts[1].includes("top") || parts[1] === "0%" || parts[1] === "0") {
        y = "top";
      } else if (parts[1].includes("bottom") || parts[1] === "100%") {
        y = "bottom";
      } else {
        y = "center";
      }
    } else if (parts[0]) {
      // If only one part, check if it's a vertical keyword
      if (parts[0].includes("top")) {
        y = "top";
        x = "center";
      } else if (parts[0].includes("bottom")) {
        y = "bottom";
        x = "center";
      }
    }

    return { x, y };
  };

  const current = $derived(() => parsePosition(value));

  // Generate CSS object-position value from x and y
  const toPositionValue = (x: PositionX, y: PositionY): string => {
    return `${x} ${y}`;
  };

  // Grid cells for 3x3 layout
  const gridCells: Array<{ x: PositionX; y: PositionY }> = [
    { x: "left", y: "top" },
    { x: "center", y: "top" },
    { x: "right", y: "top" },
    { x: "left", y: "center" },
    { x: "center", y: "center" },
    { x: "right", y: "center" },
    { x: "left", y: "bottom" },
    { x: "center", y: "bottom" },
    { x: "right", y: "bottom" },
  ];

  // X and Y options for dropdowns
  const xOptions: Array<{ value: PositionX; label: string }> = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
  ];

  const yOptions: Array<{ value: PositionY; label: string }> = [
    { value: "top", label: "Top" },
    { value: "center", label: "Center" },
    { value: "bottom", label: "Bottom" },
  ];

  function isSelected(x: PositionX, y: PositionY): boolean {
    const curr = current();
    return curr.x === x && curr.y === y;
  }

  function updatePosition(x?: PositionX, y?: PositionY) {
    const curr = current();
    const newX = x ?? curr.x;
    const newY = y ?? curr.y;
    onchange(toPositionValue(newX, newY));
  }
</script>

<div class="position-container">
  <div class="position-grid">
    {#each gridCells as cell}
      <button
        type="button"
        class="position-cell"
        class:selected={isSelected(cell.x, cell.y)}
        onclick={() => updatePosition(cell.x, cell.y)}
        title="{cell.x} {cell.y}"
      >
        <div class="position-icon" data-x={cell.x} data-y={cell.y}></div>
      </button>
    {/each}
  </div>
  <div class="position-selects">
    <div class="position-select-row">
      <label for="position-x">X:</label>
      <select
        id="position-x"
        value={current().x}
        onchange={(e) => updatePosition(e.currentTarget.value as PositionX, undefined)}
      >
        {#each xOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
    <div class="position-select-row">
      <label for="position-y">Y:</label>
      <select
        id="position-y"
        value={current().y}
        onchange={(e) => updatePosition(undefined, e.currentTarget.value as PositionY)}
      >
        {#each yOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<style>
  .position-container {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .position-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: #2a2a2a;
    padding: 4px;
    border-radius: 6px;
  }

  .position-cell {
    width: 32px;
    height: 32px;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .position-cell:hover {
    background: #2a2a2a;
    border-color: #4a4a4a;
  }

  .position-cell.selected {
    background: #0066cc;
    border-color: #0066cc;
  }

  .position-icon {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
  }

  /* Create visual indicators using CSS */
  .position-icon::before {
    content: "";
    width: 8px;
    height: 8px;
    background: #888;
    border-radius: 1px;
    position: absolute;
  }

  .position-cell.selected .position-icon::before {
    background: white;
  }

  /* Horizontal position (X) */
  .position-icon[data-x="left"]::before {
    left: 0;
  }

  .position-icon[data-x="center"]::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .position-icon[data-x="right"]::before {
    right: 0;
  }

  /* Vertical position (Y) */
  .position-icon[data-y="top"]::before {
    top: 0;
  }

  .position-icon[data-y="center"]::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .position-icon[data-y="bottom"]::before {
    bottom: 0;
  }

  /* Combined transforms */
  .position-icon[data-x="center"][data-y="center"]::before {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .position-icon[data-x="center"][data-y="top"]::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .position-icon[data-x="center"][data-y="bottom"]::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .position-icon[data-x="left"][data-y="center"]::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .position-icon[data-x="right"][data-y="center"]::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .position-selects {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .position-select-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .position-select-row label {
    min-width: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin: 0;
  }

  .position-select-row select {
    flex: 1;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
  }
</style>
