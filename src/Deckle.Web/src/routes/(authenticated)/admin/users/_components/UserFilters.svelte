<script lang="ts">
  import { DateRangeField, FilterBar, FilterField } from '$lib/components';
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
</script>

<FilterBar onApply={() => onApply({ ...draft })} {onClear}>
  <FilterField label="Search" grow>
    <input type="search" placeholder="Name or email..." bind:value={draft.search} />
  </FilterField>

  <DateRangeField label="Created" bind:from={draft.createdFrom} bind:to={draft.createdTo} />
  <DateRangeField label="Last login" bind:from={draft.lastLoginFrom} bind:to={draft.lastLoginTo} />

  <FilterField label="Role">
    <select bind:value={draft.role}>
      <option value="">Any</option>
      {#each ROLE_FILTERS as role (role)}
        <option value={role}>{role}</option>
      {/each}
    </select>
  </FilterField>

  <FilterField label="Status">
    <select bind:value={draft.status}>
      <option value="">Any</option>
      {#each STATUS_FILTERS as status (status)}
        <option value={status}>{status}</option>
      {/each}
    </select>
  </FilterField>
</FilterBar>
