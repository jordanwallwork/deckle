<script lang="ts">
  import DimensionInput from './DimensionInput.svelte';

  let {
    value,
    onchange
  }: {
    value?: number | string;
    onchange: (gap: number | string | undefined) => void;
  } = $props();
</script>

<DimensionInput label="Gap" id="gap" {value} onchange={onchange} hideLabel inline />
