<script lang="ts">
  let {
    value = $bindable(),
    type = 'text',
    id,
    placeholder,
    disabled = false,
    required = false,
    error = false,
    onchange,
    oninput,
  }: {
    value: string;
    type?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    onchange?: (value: string) => void;
    oninput?: (value: string) => void;
  } = $props();
</script>

<input
  bind:value
  {type}
  {id}
  {placeholder}
  {disabled}
  {required}
  class="base-input"
  class:error
  onchange={(e) => onchange?.(e.currentTarget.value)}
  oninput={(e) => oninput?.(e.currentTarget.value)}
/>

<style>
  @import './base-input.css';
</style>
