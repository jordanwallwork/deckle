<script lang="ts">
  // Typed inputs for a setup's declared options (#120): boolean → checkbox,
  // number → bounded stepper, select → dropdown. Each row is bound into the
  // shared `values` record keyed by option id; coercion (clamping numbers,
  // validating selects) lives in the pure choices helpers.
  import type { SetupOption } from '$lib/gamerunner/types';
  import { coerceOptionValue, type OptionValue } from '$lib/play/choices';

  let {
    options,
    values = $bindable()
  }: { options: SetupOption[]; values: Record<string, OptionValue> } = $props();

  function setValue(option: SetupOption, raw: unknown) {
    values = { ...values, [option.id]: coerceOptionValue(option, raw) };
  }
</script>

{#if options.length > 0}
  <div class="options">
    {#each options as option (option.id)}
      <div class="option-row">
        {#if option.type === 'boolean'}
          <label class="check">
            <input
              type="checkbox"
              checked={values[option.id] === true}
              onchange={(e) => setValue(option, e.currentTarget.checked)}
            />
            <span>{option.label}</span>
          </label>
        {:else if option.type === 'number'}
          <label class="field" for={`opt-${option.id}`}>{option.label}</label>
          <input
            id={`opt-${option.id}`}
            class="number"
            type="number"
            min={option.min}
            max={option.max}
            value={values[option.id] as number}
            onchange={(e) => setValue(option, e.currentTarget.valueAsNumber)}
          />
        {:else}
          <label class="field" for={`opt-${option.id}`}>{option.label}</label>
          <select
            id={`opt-${option.id}`}
            class="select"
            value={values[option.id] as string}
            onchange={(e) => setValue(option, e.currentTarget.value)}
          >
            {#each option.choices as choice (choice)}
              <option value={choice}>{choice}</option>
            {/each}
          </select>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .field {
    font-weight: 600;
    color: var(--color-text-primary);
    min-width: 5rem;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: var(--color-text-primary);
  }

  .number {
    width: 5rem;
    padding: 0.375rem 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
  }

  .select {
    padding: 0.375rem 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    min-width: 8rem;
  }
</style>
