<script lang="ts">
  import { ROLE_FILTERS, STATUS_FILTERS, type AdminUserFilters } from '$lib/utils/adminUserFilters';

  let {
    filters,
    onApply,
    onClear
  }: {
    filters: AdminUserFilters;
    onApply: (filters: AdminUserFilters) => void;
    onClear: () => void;
  } = $props();

  // Local draft so typing doesn't navigate; the parent re-keys this component on navigation
  // svelte-ignore state_referenced_locally
  let draft = $state<AdminUserFilters>({ ...filters });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onApply({ ...draft });
  }
</script>

<form class="filters" onsubmit={handleSubmit}>
  <label class="field search-field">
    <span>Search</span>
    <input type="search" placeholder="Name or email..." bind:value={draft.search} />
  </label>

  <fieldset class="field range">
    <legend>Created</legend>
    <input type="date" aria-label="Created from" bind:value={draft.createdFrom} />
    <span class="range-sep">to</span>
    <input type="date" aria-label="Created to" bind:value={draft.createdTo} />
  </fieldset>

  <fieldset class="field range">
    <legend>Last login</legend>
    <input type="date" aria-label="Last login from" bind:value={draft.lastLoginFrom} />
    <span class="range-sep">to</span>
    <input type="date" aria-label="Last login to" bind:value={draft.lastLoginTo} />
  </fieldset>

  <label class="field">
    <span>Role</span>
    <select bind:value={draft.role}>
      <option value="">Any</option>
      {#each ROLE_FILTERS as role (role)}
        <option value={role}>{role}</option>
      {/each}
    </select>
  </label>

  <label class="field">
    <span>Status</span>
    <select bind:value={draft.status}>
      <option value="">Any</option>
      {#each STATUS_FILTERS as status (status)}
        <option value={status}>{status}</option>
      {/each}
    </select>
  </label>

  <div class="actions">
    <button type="submit" class="apply-btn">Apply</button>
    <button type="button" class="clear-btn" onclick={onClear}>Clear</button>
  </div>
</form>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
  }

  .field > span,
  .field legend {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0;
    margin-bottom: 0.375rem;
  }

  .field > span {
    margin-bottom: 0;
  }

  .search-field {
    flex: 1 1 220px;
  }

  .range {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }

  .range-sep {
    font-size: 0.8125rem;
    color: #6b7280;
  }

  input,
  select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: white;
    color: #374151;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .apply-btn,
  .clear-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .apply-btn {
    background: #667eea;
    color: white;
    border: 1px solid #667eea;
  }

  .apply-btn:hover {
    background: #5a67d8;
  }

  .clear-btn {
    background: white;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .clear-btn:hover {
    border-color: #667eea;
    color: #667eea;
  }
</style>
