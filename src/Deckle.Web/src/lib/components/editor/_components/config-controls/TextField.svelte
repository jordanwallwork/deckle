<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';

  let {
    label,
    id,
    value,
    placeholder,
    oninput
  }: {
    label: string;
    id: string;
    value: string | undefined;
    placeholder?: string;
    oninput: (e: Event & { currentTarget: HTMLInputElement }) => void;
  } = $props();
</script>

<FieldWrapper {label} htmlFor={id}>
  <input
    type="text"
    {id}
    {value}
    {placeholder}
    {oninput}
  />
</FieldWrapper>
