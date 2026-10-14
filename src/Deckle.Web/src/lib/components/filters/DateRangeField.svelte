<script lang="ts">
  let {
    label,
    from = $bindable(),
    to = $bindable()
  }: {
    /** Group label; also prefixes each input's accessible name ("{label} from" / "{label} to") */
    label: string;
    /** Start date, `yyyy-mm-dd` or empty */
    from: string;
    /** End date, `yyyy-mm-dd` or empty */
    to: string;
  } = $props();
</script>

<fieldset class="date-range">
  <legend class="filter-label">{label}</legend>
  <input type="date" aria-label="{label} from" bind:value={from} />
  <span class="range-sep">to</span>
  <input type="date" aria-label="{label} to" bind:value={to} />
</fieldset>

<style>
  .date-range {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
  }

  .filter-label {
    padding: 0;
    margin-bottom: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .range-sep {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }
</style>
