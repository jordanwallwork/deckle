<script lang="ts">
  let { size = 12, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 12 12"
  fill="none"
  stroke="currentColor"
  stroke-width="1"
  class={className}
  aria-hidden="true"
>
  <rect x="3" y="5" width="6" height="5" rx="1" />
  <path d="M4 5V3.5C4 2.67 4.67 2 5.5 2h1C7.33 2 8 2.67 8 3.5V5" />
</svg>
