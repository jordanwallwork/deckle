<script lang="ts">
  let { children }: { children: any } = $props();
</script>

<div class="config-section">
  {@render children()}
</div>

<style>
  .config-section {
    padding: 1rem;
  }
</style>
