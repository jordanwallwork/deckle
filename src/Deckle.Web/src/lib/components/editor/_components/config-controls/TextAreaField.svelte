<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';

  let {
    label,
    id,
    value,
    rows = 3,
    placeholder,
    hideLabel = false,
    oninput
  }: {
    label: string;
    id: string;
    value: string;
    rows?: number;
    placeholder?: string;
    hideLabel?: boolean;
    oninput: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
  } = $props();
</script>

<FieldWrapper {label} {hideLabel} htmlFor={id}>
  <textarea
    {id}
    {rows}
    {value}
    {placeholder}
    {oninput}
  ></textarea>
</FieldWrapper>
