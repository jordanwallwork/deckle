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
  <path d="M6 2L6 6L2 6" />
  <path d="M10 2L10 6L14 6" />
  <path d="M14 10L10 10L10 14" />
  <path d="M2 10L6 10L6 14" />
</svg>
