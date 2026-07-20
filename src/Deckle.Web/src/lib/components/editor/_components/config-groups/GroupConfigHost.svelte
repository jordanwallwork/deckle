<script lang="ts">
  import type { TemplateElement } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import AccordionPanel from './AccordionPanel.svelte';

  /**
   * Binds the capability-driven group controls to the template store —
   * including edit sessions (D7) — and disables writes in read-only mode.
   */
  let {
    elements,
    dpi,
    readOnly = false
  }: { elements: TemplateElement[]; dpi: number; readOnly?: boolean } = $props();

  function update(updates: Partial<TemplateElement>, sessionKey?: string) {
    if (readOnly) return;
    for (const el of elements) {
      templateStore.updateElement(el.id, updates, sessionKey);
    }
  }

  function seal() {
    templateStore.sealSession();
  }
</script>

<AccordionPanel {elements} {dpi} {update} {seal} />
