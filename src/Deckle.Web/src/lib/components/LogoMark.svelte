<script lang="ts">
  let { width = "24", height = "24", class: className = "" }: { width?: string, height?: string, class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="20 20 88 88"
  width={width}
  height={height}
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <g
    fill="var(--color-sage)"
    stroke="var(--color-sage)"
    stroke-width="9"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M24,60 V92 C28,96 32,88 36,92 C40,96 44,88 48,92 C52,96 56,88 60,92 C64,96 68,88 72,92 V60 H24 Z"
    />

    <path
      d="M44,44 V76 C48,78 54,74 60,76 C66,78 72,74 78,76 C84,78 88,74 92,76 V44 H44 Z"
      style="filter: brightness(120%)"
    />

    <rect
      x="28"
      y="28"
      width="48"
      height="32"
      rx="6"
      ry="6"
      style="filter: brightness(140%)"
    />
  </g>
</svg>
