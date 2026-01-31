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
  <path d="M2 6L2 2L6 2" />
  <path d="M10 2L14 2L14 6" />
  <path d="M14 10L14 14L10 14" />
  <path d="M6 14L2 14L2 10" />
</svg>
