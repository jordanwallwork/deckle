<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    value = $bindable(),
    id,
    disabled = false,
    required = false,
    error = false,
    onchange,
    children
  }: {
    value: string | null;
    id?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    onchange?: (event: Event & { currentTarget: HTMLSelectElement }) => void;
    children: Snippet;
  } = $props();
</script>

<select bind:value {id} {disabled} {required} {onchange} class="base-input" class:error>
  {@render children()}
</select>

<style>
  @import './base-input.css';

  select {
    background-color: white;
    cursor: pointer;
  }
</style>
