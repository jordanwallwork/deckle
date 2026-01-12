<script lang="ts">
  import FieldWrapper from './FieldWrapper.svelte';

  let {
    label,
    id,
    value,
    placeholder,
    hideLabel = false,
    oninput
  }: {
    label: string;
    id: string;
    value: string | undefined;
    placeholder?: string;
    hideLabel?: boolean;
    oninput: (e: Event & { currentTarget: HTMLInputElement }) => void;
  } = $props();
</script>

<FieldWrapper {label} {hideLabel} htmlFor={id}>
  <input type="text" {id} {value} {placeholder} {oninput} />
</FieldWrapper>
