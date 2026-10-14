<script lang="ts">
  import type { AdminUserProject } from '$lib/types';
  import { formatShortDate } from '$lib/utils/file.utils';
  import AdminCard from './AdminCard.svelte';

  let { projects }: { projects: AdminUserProject[] } = $props();
</script>

<AdminCard title="Owned projects ({projects.length})" wide>
  {#if projects.length === 0}
    <p class="card-hint">This user doesn't own any projects.</p>
  {:else}
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Visibility</th>
            <th class="numeric">Components</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
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
        </tbody>
      </table>
    </div>
  {/if}
</AdminCard>

<style>
  .table-scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    padding: 0.5rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  td {
    padding: 0.5rem 0.75rem;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

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
