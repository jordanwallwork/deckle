<script lang="ts">
  let {
    value = $bindable(),
    type = 'text',
    id,
    placeholder,
    disabled = false,
    required = false,
    autofocus = false,
    error = false,
  }: {
    value: string;
    type?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    autofocus?: boolean;
    error?: boolean;
  } = $props();
</script>

<input
  bind:value
  {type}
  {id}
  {placeholder}
  {disabled}
  {required}
  {autofocus}
  class="base-input"
  class:error
/>

<style>
  @import './base-input.css';
</style>
