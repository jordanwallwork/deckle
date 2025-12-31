<script lang="ts">
  let {
    data,
    sortable = true,
    maxRows,
    stickyHeader = true
  }: {
    data: string[][];
    sortable?: boolean;
    maxRows?: number;
    stickyHeader?: boolean;
  } = $props();

  // Sorting state
  let sortColumn = $state<number | null>(null);
  let sortDirection = $state<'asc' | 'desc'>('asc');

  // Get headers (first row) and rows (rest of data)
  const headers = $derived(data.length > 0 ? data[0] : []);
  const rows = $derived(data.length > 1 ? data.slice(1) : []);

  // Apply max rows limit and get sorted data
  const displayedRows = $derived(() => {
    let result = rows;

    // Apply sorting if enabled and a column is selected
    if (sortable && sortColumn !== null) {
      const colIndex = sortColumn; // Type narrowing
      result = [...rows].sort((a, b) => {
        const aVal = a[colIndex] || '';
        const bVal = b[colIndex] || '';

        // Try to parse as numbers for numeric comparison
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Apply max rows limit
    if (maxRows) {
      result = result.slice(0, maxRows);
    }

    return result;
  });

  function handleSort(columnIndex: number) {
    if (!sortable) return;

    if (sortColumn === columnIndex) {
      // Toggle direction
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      sortColumn = columnIndex;
      sortDirection = 'asc';
    }
  }
</script>

<div class="data-table-container">
  <table class="data-table">
    <thead class:sticky={stickyHeader}>
      <tr>
        {#each headers as header, index}
          <th
            class:sortable
            onclick={() => handleSort(index)}
            role={sortable ? "button" : undefined}
            tabindex={sortable ? 0 : undefined}
          >
            <div class="header-content">
              <span>{header}</span>
              {#if sortable && sortColumn === index}
                <span class="sort-indicator">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              {/if}
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each displayedRows() as row}
        <tr>
          {#each row as cell}
            <td>{cell}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {#if maxRows && rows.length > maxRows}
    <p class="showing-preview">
      Showing first {maxRows} of {rows.length} rows
    </p>
  {/if}
</div>

<style>
  .data-table-container {
    overflow-x: auto;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    background-color: var(--color-bg-secondary, #f9fafb);
  }

  thead.sticky {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary, #666);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    white-space: nowrap;
  }

  th.sortable {
    cursor: pointer;
    user-select: none;
  }

  th.sortable:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .sort-indicator {
    font-size: 1rem;
    color: var(--color-primary, #0066cc);
    font-weight: bold;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    color: var(--color-text, #333);
  }

  tbody tr:hover {
    background-color: #fafafa;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .showing-preview {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: center;
    margin: 0.5rem 0 0 0;
    padding: 0.5rem;
  }
</style>
