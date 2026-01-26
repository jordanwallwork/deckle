<script lang="ts">
  let { size = 20, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class="loading-spinner {className}"
  aria-hidden="true"
>
  <circle
    cx="12"
    cy="12"
    r="10"
    stroke="currentColor"
    stroke-width="3"
    fill="none"
    stroke-linecap="round"
    stroke-dasharray="31.4 31.4"
  >
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 12 12"
      to="360 12 12"
      dur="1s"
      repeatCount="indefinite"
    />
  </circle>
</svg>

<style>
  .loading-spinner {
    display: block;
  }
</style>
