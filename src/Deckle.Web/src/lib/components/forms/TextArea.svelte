<script lang="ts">
  let {
    value = $bindable(),
    id,
    placeholder,
    disabled = false,
    required = false,
    rows = 3,
    error = false,
    onchange,
    oninput,
  }: {
    value: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    rows?: number;
    error?: boolean;
    onchange?: (value: string) => void;
    oninput?: (value: string) => void;
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
  onchange={(e) => onchange?.(e.currentTarget.value)}
  oninput={(e) => oninput?.(e.currentTarget.value)}
></textarea>

<style>
  @import './base-input.css';

  textarea {
    resize: vertical;
  }
</style>
