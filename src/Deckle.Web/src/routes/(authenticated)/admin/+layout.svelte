<script lang="ts">
  import { getMaxScreen } from '$lib/stores/maxScreen';

  let { children }: { children: any } = $props();

  const maxScreen = getMaxScreen();
</script>

<div class="admin-page-content" class:nopadding={$maxScreen}>
  {@render children()}
</div>

<style>
  .admin-page-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    padding: 2rem;
  }
  .admin-page-content.nopadding {
    padding: 0;
  }
</style>

