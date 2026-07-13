<script lang="ts">
  let { children }: { children: any } = $props();
</script>

<!-- theme-light: the spreadsheet grid editor is not yet dark-converted.
     Lock it light to avoid a mid-page inversion (Page Theme Lock). -->
<div class="theme-light-wrap theme-light">
  {@render children()}
</div>

<style>
  .theme-light-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-primary);
  }
</style>
