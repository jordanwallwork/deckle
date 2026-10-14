<script lang="ts">
  import type { AdminUserProject } from '$lib/types';
  import { Table } from '$lib/components';
  import { formatShortDate } from '$lib/utils/file.utils';
  import AdminCard from './AdminCard.svelte';

  let { projects }: { projects: AdminUserProject[] } = $props();
</script>

<AdminCard title="Owned projects ({projects.length})" wide>
  {#if projects.length === 0}
    <p class="card-hint">This user doesn't own any projects.</p>
  {:else}
    <Table compact label="Owned projects">
      {#snippet head()}
        <th>Name</th>
        <th>Code</th>
        <th>Visibility</th>
        <th class="numeric">Components</th>
        <th>Created</th>
      {/snippet}

      {#each projects as project (project.id)}
        <tr>
          <td>
            <a href="/projects/{project.ownerUsername}/{project.code}">{project.name}</a>
          </td>
          <td><code>{project.code}</code></td>
          <td>{project.visibility}</td>
          <td class="numeric">{project.componentCount}</td>
          <td>{formatShortDate(project.createdAt)}</td>
        </tr>
      {/each}
    </Table>
  {/if}
</AdminCard>

<style>
  .numeric {
    text-align: right;
  }

  a {
    color: #667eea;
    font-weight: 600;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  code {
    font-size: 0.8125rem;
    color: #6b7280;
  }
</style>
