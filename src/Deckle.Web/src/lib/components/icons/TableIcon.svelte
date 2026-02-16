<script lang="ts">
  let { size = 16, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <line x1="3" y1="4" x2="13" y2="4" />
  <line x1="3" y1="8" x2="13" y2="8" />
  <line x1="3" y1="12" x2="13" y2="12" />
</svg>
