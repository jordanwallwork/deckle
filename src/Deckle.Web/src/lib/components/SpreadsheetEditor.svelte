<script lang="ts">
  let {
    headers,
    rows,
    onchange
  }: {
    headers: string[];
    rows: string[][];
    onchange: (headers: string[], rows: string[][]) => void;
  } = $props();

  function updateHeader(index: number, value: string) {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    onchange(newHeaders, rows);
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    const newRows = rows.map((r) => [...r]);
    newRows[rowIndex][colIndex] = value;
    onchange(headers, newRows);
  }

  function addColumn() {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newRows = rows.map((r) => [...r, '']);
    onchange(newHeaders, newRows);
  }

  function addRow() {
    const newRow = Array(headers.length).fill('');
    onchange(headers, [...rows, newRow]);
  }

  function deleteColumn(index: number) {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== index);
    const newRows = rows.map((r) => r.filter((_, i) => i !== index));
    onchange(newHeaders, newRows);
  }

  function deleteRow(index: number) {
    const newRows = rows.filter((_, i) => i !== index);
    onchange(headers, newRows);
  }
</script>

<div class="spreadsheet-editor">
  <div class="table-container">
    <table class="spreadsheet-table">
      <thead>
        <tr>
          <th class="row-number-header">#</th>
          {#each headers as header, colIndex}
            <th>
              <div class="header-cell">
                <input
                  type="text"
                  value={header}
                  oninput={(e) => updateHeader(colIndex, e.currentTarget.value)}
                  class="cell-input header-input"
                  placeholder="Header"
                />
                {#if headers.length > 1}
                  <button
                    class="delete-col-btn"
                    onclick={() => deleteColumn(colIndex)}
                    title="Delete column"
                  >
                    &times;
                  </button>
                {/if}
              </div>
            </th>
          {/each}
          <th class="add-col-header">
            <button class="add-col-btn" onclick={addColumn} title="Add column">+</button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, rowIndex}
          <tr>
            <td class="row-number">{rowIndex + 1}</td>
            {#each row as cell, colIndex}
              <td>
                <input
                  type="text"
                  value={cell}
                  oninput={(e) => updateCell(rowIndex, colIndex, e.currentTarget.value)}
                  class="cell-input"
                  placeholder=""
                />
              </td>
            {/each}
            <td class="row-actions">
              <button
                class="delete-row-btn"
                onclick={() => deleteRow(rowIndex)}
                title="Delete row"
              >
                &times;
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <button class="add-row-btn" onclick={addRow}>+ Add Row</button>
</div>

<style>
  .spreadsheet-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .table-container {
    overflow-x: auto;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .spreadsheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    background-color: #f9fafb;
  }

  th {
    padding: 0;
    text-align: left;
    font-weight: 600;
    color: #666;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  td {
    padding: 0;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
  }

  .row-number-header {
    width: 2.5rem;
    text-align: center;
    padding: 0.5rem;
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .row-number {
    width: 2.5rem;
    text-align: center;
    padding: 0.5rem;
    color: #9ca3af;
    font-size: 0.75rem;
    background-color: #f9fafb;
  }

  .header-cell {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .cell-input {
    width: 100%;
    border: none;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    background: transparent;
    outline: none;
    font-family: inherit;
  }

  .cell-input:focus {
    background-color: #f0f4ff;
  }

  .header-input {
    font-weight: 600;
    color: #374151;
  }

  .delete-col-btn {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border: none;
    background: none;
    color: #d1d5db;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    padding: 0;
    margin-right: 0.25rem;
  }

  .delete-col-btn:hover {
    color: #ef4444;
    background-color: #fee2e2;
  }

  .add-col-header {
    width: 2.5rem;
    text-align: center;
    padding: 0.5rem;
  }

  .add-col-btn {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px dashed #d1d5db;
    background: none;
    color: #9ca3af;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    padding: 0;
  }

  .add-col-btn:hover {
    border-color: #667eea;
    color: #667eea;
    background-color: #f0f4ff;
  }

  .row-actions {
    width: 2.5rem;
    text-align: center;
    padding: 0.25rem;
  }

  .delete-row-btn {
    width: 1.25rem;
    height: 1.25rem;
    border: none;
    background: none;
    color: #d1d5db;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    padding: 0;
    margin: 0 auto;
  }

  .delete-row-btn:hover {
    color: #ef4444;
    background-color: #fee2e2;
  }

  tbody tr:hover {
    background-color: #fafafa;
  }

  .add-row-btn {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    border: 1px dashed #d1d5db;
    background: none;
    color: #6b7280;
    font-size: 0.8125rem;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .add-row-btn:hover {
    border-color: #667eea;
    color: #667eea;
    background-color: #f0f4ff;
  }
</style>
