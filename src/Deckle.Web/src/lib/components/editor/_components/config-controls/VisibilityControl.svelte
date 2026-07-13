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
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .segmented-control {
    display: flex;
    background: var(--color-bg-subtle);
    border-radius: 6px;
    padding: 2px;
  }

  .segment {
    flex: 1;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .segment:hover:not(.active) {
    color: var(--color-text-primary);
    background: rgba(255, 255, 255, 0.1);
  }

  .segment.active {
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-sm);
  }

  .condition-field {
    margin-top: 0.75rem;
  }

  .condition-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .condition-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-subtle);
    font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
    box-sizing: border-box;
    height: 2.125rem;
    color: var(--color-accent-fg);
  }

  .condition-input:focus {
    outline: none;
    border-color: var(--color-accent-fg);
  }

  .condition-input::placeholder {
    color: var(--color-text-secondary);
    font-family: monospace;
  }

  .condition-hint {
    margin: 0.375rem 0 0;
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    line-height: 1.3;
  }
</style>
