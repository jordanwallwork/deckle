<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';

  let {
    label,
    id,
    value,
    options,
    hideLabel = false,
    onchange
  }: {
    label: string;
    id: string;
    value: string | number;
    options: Array<{ value: string | number; label: string }>;
    hideLabel?: boolean;
    onchange: (value: string) => void;
  } = $props();
</script>

<FieldWrapper {label} {hideLabel} htmlFor={id}>
  <select
    {id}
    {value}
    onchange={(e) => onchange(e.currentTarget.value)}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</FieldWrapper>
