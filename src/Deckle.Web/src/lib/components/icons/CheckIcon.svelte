<script lang="ts">
  let { size = 20, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  class={className}
  aria-hidden="true"
>
  <path d="M20 6L9 17l-5-5" />
</svg>
