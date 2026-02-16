<script lang="ts">
  import type { BaseElement, IteratorElement } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import BaseElementConfig from './BaseElementConfig.svelte';
  import TextField from '../config-controls/TextField.svelte';
  import Fields from '../config-controls/Fields.svelte';

  let { element }: { element: IteratorElement } = $props();

  function updateElement(updates: Partial<IteratorElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<BaseElementConfig
  {element}
  updateElement={updateElement as (updates: Partial<BaseElement>) => void}
>
  <TextField
    label="Variable Name"
    id="iterator-name"
    value={element.iteratorName}
    placeholder="i"
    oninput={(e) => updateElement({ iteratorName: e.currentTarget.value })}
  />

  <Fields>
    <TextField
      label="From"
      id="iterator-from"
      value={element.fromExpression}
      placeholder="1"
      oninput={(e) => updateElement({ fromExpression: e.currentTarget.value })}
    />

    <TextField
      label="To"
      id="iterator-to"
      value={element.toExpression}
      placeholder="3"
      oninput={(e) => updateElement({ toExpression: e.currentTarget.value })}
    />
  </Fields>
</BaseElementConfig>
