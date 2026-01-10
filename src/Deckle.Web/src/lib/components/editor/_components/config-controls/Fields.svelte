<script lang="ts">
  let { children }: { children: any } = $props();
</script>

<div class="fields">
  {@render children()}
</div>

<style>
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    row-gap: 0;
  }

  :global(.fields > *) {
    flex: 1 1 120px;
    min-width: 120px;
  }
</style>
