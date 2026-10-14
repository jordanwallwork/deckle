<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { Pagination } from '$lib/components';
  import type { AdminUserSortKey } from '$lib/api/admin';
  import {
    buildUserQuery,
    emptyUserFilters,
    USER_SORT_INITIAL_DIRECTION,
    type AdminUserFilters,
    type AdminUserSort
  } from '$lib/utils/adminUserFilters';
  import { toggleSort } from '$lib/utils/sort';
  import UserFilters from './_components/UserFilters.svelte';
  import UsersTable from './_components/UsersTable.svelte';

  let { data }: { data: PageData } = $props();

  function navigate(
    filters: AdminUserFilters,
    page: number,
    sort: AdminUserSort = data.currentSort
  ) {
    return goto(`/admin/users${buildUserQuery(filters, page, data.currentPageSize, sort)}`);
  }

  // Applying or clearing filters keeps the current sort; changing the sort returns to page 1
  const applyFilters = (filters: AdminUserFilters) => navigate(filters, 1);
  const clearFilters = () => navigate(emptyUserFilters(), 1);
  const goToPage = (page: number) => navigate(data.currentFilters, page);
  const changeSort = (key: AdminUserSortKey) =>
    navigate(
      data.currentFilters,
      1,
      toggleSort(data.currentSort, key, USER_SORT_INITIAL_DIRECTION[key])
    );

  const totalPages = $derived(Math.ceil(data.usersResponse.totalCount / data.currentPageSize));
</script>

<svelte:head>
  <title>User Management - Admin - Deckle</title>
</svelte:head>

<div class="users-container">
  <div class="users-header">
    <div class="header-left">
      <h1>User Management</h1>
      <p class="users-count">
        {data.usersResponse.totalCount} matching user{data.usersResponse.totalCount === 1
          ? ''
          : 's'}
      </p>
    </div>
  </div>

  {#key data.currentFilters}
    <UserFilters filters={data.currentFilters} onApply={applyFilters} onClear={clearFilters} />
  {/key}

  {#if data.usersResponse.users.length === 0}
    <p class="empty-state">No users match these filters.</p>
  {:else}
    <UsersTable users={data.usersResponse.users} sort={data.currentSort} onSort={changeSort} />
  {/if}

  <Pagination page={data.currentPage} {totalPages} onPageChange={goToPage} />
</div>

<style>
  .users-header {
    margin-bottom: 2rem;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .users-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  .users-count {
    color: #666;
    font-size: 0.875rem;
    margin: 0;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    margin: 0;
  }
</style>
