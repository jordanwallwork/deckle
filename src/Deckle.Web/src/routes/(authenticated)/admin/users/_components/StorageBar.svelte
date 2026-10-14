<script lang="ts">
  let { percentage }: { percentage: number } = $props();
</script>

<div
  class="storage-bar"
  role="progressbar"
  aria-label="Storage used"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(percentage)}
>
  <div class="storage-fill" class:warning={percentage > 80} style:width="{percentage}%"></div>
</div>

<style>
  .storage-bar {
    width: 100%;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }

  .storage-fill {
    height: 100%;
    background: #667eea;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .storage-fill.warning {
    background: #f59e0b;
  }
</style>
