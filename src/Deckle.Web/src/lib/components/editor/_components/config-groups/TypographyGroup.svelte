<script lang="ts">
  import type { GroupControlProps } from './groupProps';
  import type { TextElement, TemplateElement, FontMetadata } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import { fontLoader } from '$lib/stores/fontLoader';
  import { fieldState } from '../../groupModel';
  import { getEffectiveDefault } from '../../effectiveDefaults';
  import PropertyField from './PropertyField.svelte';
  import FontSelector from '../config-controls/FontSelector.svelte';
  import DimensionInput from '../config-controls/DimensionInput.svelte';
  import SelectField from '../config-controls/SelectField.svelte';
  import ColorPicker from '../config-controls/ColorPicker.svelte';
  import NumberField from '../config-controls/NumberField.svelte';
  import Fields from '../config-controls/Fields.svelte';

  let { elements, update }: GroupControlProps = $props();

  const el = $derived(elements[0] as TextElement);

  // Font tracking (regression-preserving: mirrors the previous TextConfig).
  function extractUsedFonts(e: TemplateElement, meta: FontMetadata[] | undefined): FontMetadata[] {
    const fonts: FontMetadata[] = [];
    if (e.type === 'text' && e.fontFamily && e.fontFamily !== 'System Default') {
      const stored = meta?.find((f) => f.family === e.fontFamily);
      fonts.push({ family: e.fontFamily, category: stored?.category || 'sans-serif' });
    }
    if ((e.type === 'container' || e.type === 'iterator' || e.type === 'shape' || e.type === 'grid') && e.children) {
      for (const child of e.children) fonts.push(...extractUsedFonts(child, meta));
    }
    return fonts;
  }

  const usedFonts = $derived.by(() => {
    const all = extractUsedFonts($templateStore.root, $templateStore.root.fonts);
    return all.filter(
      (font, i, self) =>
        font.family !== el.fontFamily && self.findIndex((f) => f.family === font.family) === i
    );
  });

  function handleFontChange(font: { family: string; category: string }) {
    const fontFamily = font.family === 'System Default' ? undefined : font.family;
    update({ fontFamily });
    if (font.family !== 'System Default') {
      fontLoader.loadFont(font.family);
      templateStore.updateFontMetadata(font.family, font.category);
    }
  }

  const fontSize = $derived(fieldState(elements, (e) => (e as TextElement).fontSize));
  const color = $derived(fieldState(elements, (e) => (e as TextElement).color));
  const lineHeight = $derived(fieldState(elements, (e) => (e as TextElement).lineHeight));
  const letterSpacing = $derived(fieldState(elements, (e) => (e as TextElement).letterSpacing));

  const sizeDefault = $derived(String(getEffectiveDefault('text', 'fontSize') ?? '16'));
  const colorDefault = $derived(String(getEffectiveDefault('text', 'color') ?? '#000000'));
</script>

<div class="group-body">
  <FontSelector
    label="Font Family"
    id="typo-font-family"
    value={el.fontFamily || 'System Default'}
    {usedFonts}
    onchange={handleFontChange}
  />

  <Fields>
    <PropertyField label="Size" set={fontSize.set} mixed={fontSize.mixed} onclear={() => update({ fontSize: undefined })}>
      <DimensionInput
        label="Font Size"
        id="typo-size"
        hideLabel
        value={fontSize.value}
        placeholder={fontSize.mixed ? 'Mixed' : sizeDefault}
        onchange={(v) => update({ fontSize: v }, `${el.id}:fontSize`)}
      />
    </PropertyField>

    <SelectField
      label="Weight"
      id="typo-weight"
      value={el.fontWeight?.toString() || 'normal'}
      options={[
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Bold' },
        { value: '300', label: 'Light (300)' },
        { value: '400', label: 'Regular (400)' },
        { value: '500', label: 'Medium (500)' },
        { value: '600', label: 'Semi-Bold (600)' },
        { value: '700', label: 'Bold (700)' },
        { value: '800', label: 'Extra-Bold (800)' }
      ]}
      onchange={(v) => update({ fontWeight: Number.isNaN(Number(v)) ? (v as TextElement['fontWeight']) : Number.parseInt(v) })}
    />
  </Fields>

  <Fields>
    <SelectField
      label="Align"
      id="typo-align"
      value={el.textAlign || 'left'}
      options={[
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'justify', label: 'Justify' }
      ]}
      onchange={(v) => update({ textAlign: v as TextElement['textAlign'] })}
    />

    <SelectField
      label="Style"
      id="typo-style"
      value={el.fontStyle || 'normal'}
      options={[
        { value: 'normal', label: 'Normal' },
        { value: 'italic', label: 'Italic' },
        { value: 'oblique', label: 'Oblique' }
      ]}
      onchange={(v) => update({ fontStyle: v as TextElement['fontStyle'] })}
    />
  </Fields>

  <PropertyField label="Text Color" set={color.set} mixed={color.mixed} onclear={() => update({ color: undefined })}>
    <ColorPicker
      label="Text Color"
      id="typo-color"
      hideLabel
      value={color.value ?? ''}
      placeholder={color.mixed ? 'Mixed' : colorDefault}
      onchange={(c) => update({ color: c || undefined })}
    />
  </PropertyField>

  <Fields>
    <PropertyField label="Line height" set={lineHeight.set} mixed={lineHeight.mixed} onclear={() => update({ lineHeight: undefined })}>
      <NumberField
        label="Line Height"
        id="typo-line-height"
        hideLabel
        step="0.1"
        placeholder={lineHeight.mixed ? 'Mixed' : '1.5'}
        value={lineHeight.value ?? ''}
        oninput={(e) => {
          const v = e.currentTarget.value;
          update(
            { lineHeight: v === '' ? undefined : Number.isNaN(Number(v)) ? v : Number.parseFloat(v) },
            `${el.id}:lineHeight`
          );
        }}
      />
    </PropertyField>

    <PropertyField label="Letter spacing" set={letterSpacing.set} mixed={letterSpacing.mixed} onclear={() => update({ letterSpacing: undefined })}>
      <NumberField
        label="Letter Spacing"
        id="typo-letter-spacing"
        hideLabel
        unit="px"
        step="0.1"
        placeholder={letterSpacing.mixed ? 'Mixed' : '0'}
        value={letterSpacing.value ?? ''}
        oninput={(e) => {
          const v = Number.parseFloat(e.currentTarget.value);
          update({ letterSpacing: Number.isNaN(v) ? undefined : v }, `${el.id}:letterSpacing`);
        }}
      />
    </PropertyField>
  </Fields>

  <Fields>
    <SelectField
      label="Decoration"
      id="typo-decoration"
      value={el.textDecoration || 'none'}
      options={[
        { value: 'none', label: 'None' },
        { value: 'underline', label: 'Underline' },
        { value: 'overline', label: 'Overline' },
        { value: 'line-through', label: 'Line Through' }
      ]}
      onchange={(v) => update({ textDecoration: v as TextElement['textDecoration'] })}
    />

    <SelectField
      label="Transform"
      id="typo-transform"
      value={el.textTransform || 'none'}
      options={[
        { value: 'none', label: 'None' },
        { value: 'uppercase', label: 'Uppercase' },
        { value: 'lowercase', label: 'Lowercase' },
        { value: 'capitalize', label: 'Capitalize' }
      ]}
      onchange={(v) => update({ textTransform: v as TextElement['textTransform'] })}
    />
  </Fields>

  <SelectField
    label="Word wrap"
    id="typo-word-wrap"
    value={el.wordWrap || 'normal'}
    options={[
      { value: 'normal', label: 'Normal' },
      { value: 'break-word', label: 'Break word' },
      { value: 'break-all', label: 'Break all' }
    ]}
    onchange={(v) => update({ wordWrap: v as TextElement['wordWrap'] })}
  />
</div>

<style>
  .group-body {
    display: flex;
    flex-direction: column;
  }
</style>
