<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';

  let {
    label,
    id,
    value,
    rows = 3,
    placeholder,
    oninput
  }: {
    label: string;
    id: string;
    value: string;
    rows?: number;
    placeholder?: string;
    oninput: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
  } = $props();
</script>

<FieldWrapper {label} htmlFor={id}>
  <textarea
    {id}
    {rows}
    {value}
    {placeholder}
    {oninput}
  ></textarea>
</FieldWrapper>
