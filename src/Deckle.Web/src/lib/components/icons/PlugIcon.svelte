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
    d="M11.3 1.046A1 1 0 0112 2v5h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V9H9v1a1 1 0 11-2 0V9H6a1 1 0 110-2h1V2a1 1 0 011.7-.714l.3.26.3-.26A1 1 0 0111.3 1.046zM6 12a1 1 0 01.707.293l.793.793V15a2 2 0 002 2h1a2 2 0 002-2v-1.914l.793-.793a1 1 0 011.414 1.414l-.793.793V15a4 4 0 01-4 4h-1a4 4 0 01-4-4v-1.5l-.793-.793A1 1 0 016 12z"
    clip-rule="evenodd"
  />
</svg>
