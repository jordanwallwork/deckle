<script lang="ts">
  import { CARD_SIZES } from '$lib/constants';
  import { FormField, Input, Select } from '$lib/components/forms';

  let {
    cardSize = $bindable(),
    componentName = $bindable()
  }: {
    cardSize: string;
    componentName: string;
  } = $props();
</script>

<div class="configuration-form">
  <FormField label="Component Name" name="component-name">
    <Input
      id="component-name"
      bind:value={componentName}
      placeholder="Enter component name"
    />
  </FormField>

  <FormField label="Card Size" name="card-size">
    <Select id="card-size" bind:value={cardSize}>
      {#each CARD_SIZES as size}
        <option value={size.value}>{size.label}</option>
      {/each}
    </Select>
  </FormField>
</div>

<style>
  .configuration-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
</style>
