<script lang="ts">
  let { size = 16, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  width={size * 0.75}
  height={size}
  viewBox="0 0 12 16"
  fill="currentColor"
  class={className}
  aria-hidden="true"
>
  <circle cx="3" cy="4" r="1.5" />
  <circle cx="9" cy="4" r="1.5" />
  <circle cx="3" cy="8" r="1.5" />
  <circle cx="9" cy="8" r="1.5" />
  <circle cx="3" cy="12" r="1.5" />
  <circle cx="9" cy="12" r="1.5" />
</svg>
