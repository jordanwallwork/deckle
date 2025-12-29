<script lang="ts">
  let { visible = true, onchange }: { visible?: boolean; onchange: (visible: boolean) => void } = $props();
</script>

<div class="field checkbox-field">
  <label>
    <input
      type="checkbox"
      checked={visible !== false}
      onchange={(e) => onchange(e.currentTarget.checked)}
    />
    <span>Visible</span>
  </label>
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .checkbox-field label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-field input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .checkbox-field span {
    font-size: 0.813rem;
    color: #333;
  }
</style>
