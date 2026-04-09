<script lang="ts">
  import { onMount } from 'svelte';
  import ColorPicker from 'colorpicker/dist/colorpicker.js';
  import 'colorpicker/dist/colorpicker.css';

  let {
    label,
    id,
    value = '',
    onchange
  }: {
    label: string;
    id: string;
    value?: string;
    onchange: (color: string) => void;
  } = $props();

  let buttonEl: HTMLButtonElement;
  let picker: ColorPicker | undefined;
  let pickerUpdating = false;

  function looksLikeColor(val: string) {
    return /^(#|rgb|rgba|hsl|hsv)/i.test(val.trim());
  }

  onMount(() => {
    picker = new ColorPicker(buttonEl, {
      enableAlpha: true,
      submitMode: 'confirm',
      showClearButton: true,
      color: looksLikeColor(value) ? value : null
    });

    picker.on('pick', (color) => {
      pickerUpdating = true;
      const str = color ? color.toString() : '';
      onchange(str);
      pickerUpdating = false;
    });

    return () => picker?.destroy();
  });

  $effect(() => {
    if (!picker || pickerUpdating) return;
    if (looksLikeColor(value)) {
      picker.setColor(value, false);
    } else if (!value) {
      picker.clear(false);
    }
  });

  function handleTextInput(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    onchange(val);
    if (picker && looksLikeColor(val)) {
      picker.setColor(val, false);
    } else if (picker && !val) {
      picker.clear(false);
    }
  }
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="color-input">
    <button bind:this={buttonEl} aria-label="Open color picker" style="--cp-size:calc(2rem + 2px)"
    ></button>
    <input type="text" {id} {value} oninput={handleTextInput} placeholder="Color or formula" />
  </div>
</div>

<style>
  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .color-input {
    display: flex;
    align-items: center;
  }

  .color-input input[type='text'] {
    flex: 1;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-left: 0;
    border-radius: 4px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    background: white;
    box-sizing: border-box;
    margin-left: -3px;
    z-index: 1;
  }

  .color-input input[type='text']:focus {
    outline: none;
    border-color: #0066cc;
  }

  .color-input button {
    z-index: 2;
    border-width: 1px !important;
  }
</style>

