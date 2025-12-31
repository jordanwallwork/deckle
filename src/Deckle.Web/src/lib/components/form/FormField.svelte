<script lang="ts">
  let {
    label,
    htmlFor,
    children
  }: {
    label: string;
    htmlFor?: string;
    children: any;
  } = $props();
</script>

<div class="form-field">
  <label for={htmlFor} class="form-label">{label}</label>
  <div class="form-control">
    {@render children()}
  </div>
</div>

<style>
  .form-field {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text, #333);
    margin-bottom: 0.5rem;
  }

  .form-control {
    position: relative;
  }
</style>
