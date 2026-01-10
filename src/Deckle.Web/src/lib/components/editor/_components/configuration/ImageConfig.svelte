<script lang="ts">
  import type { ImageElement } from "../../types";
  import { templateStore } from "$lib/stores/templateElements";
  import BaseElementConfig from "./BaseElementConfig.svelte";
  import TextField from "../config-controls/TextField.svelte";
  import SelectField from "../config-controls/SelectField.svelte";
  import ObjectPositionGrid from "../config-controls/ObjectPositionGrid.svelte";

  let { element }: { element: ImageElement } = $props();

  function updateElement(updates: Partial<ImageElement>) {
    templateStore.updateElement(element.id, updates);
  }
</script>

<BaseElementConfig {element} {updateElement}>
  <TextField
    label="Image URL"
    id="image-url"
    placeholder="https://example.com/image.jpg"
    value={element.imageId}
    oninput={(e) => updateElement({ imageId: e.currentTarget.value })}
  />

  <SelectField
    label="Object Fit"
    id="object-fit"
    value={element.objectFit || "cover"}
    options={[
      { value: "cover", label: "Cover" },
      { value: "contain", label: "Contain" },
      { value: "fill", label: "Fill" },
      { value: "none", label: "None" },
      { value: "scale-down", label: "Scale Down" },
    ]}
    onchange={(value) => updateElement({ objectFit: value as any })}
  />

  {#if element.objectFit !== "fill"}
    <div class="object-position-section">
      <label for="object-position" class="section-label">Object Position</label>
      <ObjectPositionGrid
        value={element.objectPosition ?? "center center"}
        onchange={(position) => updateElement({ objectPosition: position })}
      />
    </div>
  {/if}
</BaseElementConfig>

<style>
  .object-position-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #374151;
    margin: 0;
  }
</style>
