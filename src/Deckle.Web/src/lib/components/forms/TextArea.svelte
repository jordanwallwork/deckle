<script lang="ts">
  let {
    value = $bindable(),
    id,
    placeholder,
    disabled = false,
    required = false,
    rows = 3,
    error = false,
  }: {
    value: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    rows?: number;
    error?: boolean;
  } = $props();
</script>

<textarea
  bind:value
  {id}
  {placeholder}
  {disabled}
  {required}
  {rows}
  class="base-input"
  class:error
></textarea>

<style>
  @import './base-input.css';

  textarea {
    resize: vertical;
  }
</style>
