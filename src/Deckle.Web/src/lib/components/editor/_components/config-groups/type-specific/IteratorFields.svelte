<script lang="ts">
  import type { GroupControlProps } from '../groupProps';
  import type { IteratorElement } from '../../../types';
  import TextField from '../../config-controls/TextField.svelte';
  import Fields from '../../config-controls/Fields.svelte';

  let { elements, update }: GroupControlProps = $props();
  const el = $derived(elements[0] as IteratorElement);
</script>

<div class="iterator-fields">
  <TextField
    label="Variable Name"
    id="iterator-name"
    value={el.iteratorName}
    placeholder="i"
    oninput={(e) => update({ iteratorName: e.currentTarget.value }, `${el.id}:iteratorName`)}
  />

  <Fields>
    <TextField
      label="From"
      id="iterator-from"
      value={el.fromExpression}
      placeholder="1"
      oninput={(e) => update({ fromExpression: e.currentTarget.value }, `${el.id}:from`)}
    />

    <TextField
      label="To"
      id="iterator-to"
      value={el.toExpression}
      placeholder="3"
      oninput={(e) => update({ toExpression: e.currentTarget.value }, `${el.id}:to`)}
    />
  </Fields>
</div>

<style>
  .iterator-fields {
    display: flex;
    flex-direction: column;
  }
</style>
