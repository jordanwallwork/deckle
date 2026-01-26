<script lang="ts">
  let { size = 20, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  viewBox="0 0 20 20"
  width={size}
  height={size}
  fill="currentColor"
  class={className}
  aria-hidden="true"
>
  <path
    fill-rule="evenodd"
    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
    clip-rule="evenodd"
  />
</svg>
