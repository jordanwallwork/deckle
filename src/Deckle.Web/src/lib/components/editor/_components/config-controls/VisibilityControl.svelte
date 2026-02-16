<script lang="ts">
  import type { VisibilityMode } from '../../types';

  let {
    mode = 'show',
    condition = '',
    onModeChange,
    onConditionChange
  }: {
    mode?: VisibilityMode;
    condition?: string;
    onModeChange: (mode: VisibilityMode) => void;
    onConditionChange: (condition: string) => void;
  } = $props();

  const options: { value: VisibilityMode; label: string }[] = [
    { value: 'show', label: 'Show' },
    { value: 'hide', label: 'Hide' },
    { value: 'conditional', label: 'Conditional' }
  ];
</script>

<div class="visibility-control">
  <label class="field-label">Visibility</label>
  <div class="segmented-control">
    {#each options as option}
      <button
        type="button"
        class="segment"
        class:active={mode === option.value}
        onclick={() => onModeChange(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>

  {#if mode === 'conditional'}
    <div class="condition-field">
      <label for="visibility-condition" class="condition-label">Condition</label>
      <input
        type="text"
        id="visibility-condition"
        class="condition-input"
        placeholder={"e.g. {{field}} != ''"}
        value={condition}
        oninput={(e) => onConditionChange(e.currentTarget.value)}
      />
      <p class="condition-hint">
        Use merge fields to create a formula. Empty or falsy values will hide the element.
      </p>
    </div>
  {/if}
</div>

<style>
  .visibility-control {
    margin-bottom: 1rem;
  }

  .field-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .segmented-control {
    display: flex;
    background: #f3f4f6;
    border-radius: 6px;
    padding: 2px;
  }

  .segment {
    flex: 1;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .segment:hover:not(.active) {
    color: #374151;
    background: rgba(255, 255, 255, 0.5);
  }

  .segment.active {
    background: white;
    color: #1a1a1a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .condition-field {
    margin-top: 0.75rem;
  }

  .condition-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .condition-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #f8f9fa;
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
    box-sizing: border-box;
    height: 2.125rem;
    color: #1a73e8;
  }

  .condition-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .condition-input::placeholder {
    color: #9ca3af;
    font-family: monospace;
  }

  .condition-hint {
    margin: 0.375rem 0 0;
    font-size: 0.6875rem;
    color: #9ca3af;
    line-height: 1.3;
  }
</style>
