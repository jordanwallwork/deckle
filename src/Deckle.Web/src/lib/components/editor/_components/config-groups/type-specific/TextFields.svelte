<script lang="ts">
  import type { GroupControlProps } from '../groupProps';
  import type { TextElement } from '../../../types';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import HighlightedTextArea from '../../config-controls/HighlightedTextArea.svelte';

  let { elements, update, seal }: GroupControlProps = $props();

  const el = $derived(elements[0] as TextElement);

  const dataSourceRowStore = getDataSourceRow();
  const dataSourceFields = $derived($dataSourceRowStore ? Object.keys($dataSourceRowStore) : []);

  // Content edits collapse into one undo step via an edit session keyed per
  // element (ADR-0001 D7), sealed on blur.
  function handleInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
    update({ content: e.currentTarget.value }, `${el.id}:content`);
  }
</script>

<HighlightedTextArea
  label="Content"
  id="content"
  rows={3}
  value={el.content}
  showToolbar={true}
  {dataSourceFields}
  markdown={el.markdown ?? false}
  onmarkdownchange={(v) => update({ markdown: v })}
  oninput={handleInput}
  onblur={seal}
/>
