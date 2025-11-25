<script lang="ts">
  import type { PageData } from './$types';
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  interface DataSource {
    id: string;
    projectId: string;
    name: string;
    type: string;
    googleSheetsId?: string;
    googleSheetsUrl?: string;
    createdAt: string;
    updatedAt: string;
  }

  interface SheetMetadata {
    sheetId: number;
    title: string;
    rowCount: number;
    columnCount: number;
  }

  interface SpreadsheetMetadata {
    spreadsheetId: string;
    title: string;
    sheets: SheetMetadata[];
  }

  let dataSource = $state<DataSource | null>(null);
  let metadata = $state<SpreadsheetMetadata | null>(null);
  let loading = $state(true);
  let errorMessage = $state('');
  let selectedSheetIndex = $state(0);
  let needsAuth = $state(false);

  onMount(async () => {
    await loadDataSource();
  });

  async function loadDataSource() {
    try {
      loading = true;
      errorMessage = '';

      // Get data source details
      const dsResponse = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}`, {
        credentials: 'include'
      });

      if (!dsResponse.ok) {
        if (dsResponse.status === 404) {
          errorMessage = 'Data source not found';
          return;
        }
        throw new Error('Failed to load data source');
      }

      dataSource = await dsResponse.json();

      // Get spreadsheet metadata
      const metadataResponse = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}/metadata`, {
        credentials: 'include'
      });

      if (metadataResponse.ok) {
        metadata = await metadataResponse.json();
      } else if (metadataResponse.status === 401 || metadataResponse.status === 403) {
        // Check if it's an auth issue
        const authResponse = await fetch(`${config.apiUrl}/google-sheets-auth/status`, {
          credentials: 'include'
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (!authData.authorized) {
            needsAuth = true;
            errorMessage = 'Google Sheets authorization required to view this data source.';
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data source:', error);
      errorMessage = 'Failed to load data source. Please try again.';
    } finally {
      loading = false;
    }
  }

  function authorizeGoogleSheets() {
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `${config.apiUrl}/google-sheets-auth/authorize?returnUrl=${returnUrl}`;
  }

  function getEmbedUrl(): string {
    if (!dataSource?.googleSheetsId || !metadata) {
      return '';
    }

    const sheetGid = metadata.sheets[selectedSheetIndex]?.sheetId ?? 0;
    return `https://docs.google.com/spreadsheets/d/${dataSource.googleSheetsId}/preview?gid=${sheetGid}&single=true&widget=true&headers=false`;
  }

  async function deleteDataSource() {
    if (!confirm('Are you sure you want to delete this data source?')) {
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        goto(`/projects/${data.projectId}/data-sources`);
      }
    } catch (error) {
      console.error('Failed to delete data source:', error);
    }
  }
</script>

<svelte:head>
  {#if dataSource}
    <title>{dataSource.name} · Data Sources · {data.project.name} · Deckle</title>
    <meta name="description" content="View and manage {dataSource.name} data source for {data.project.name}. Preview spreadsheet data and configure how it connects to your game components." />
  {:else}
    <title>Data Source · {data.project.name} · Deckle</title>
    <meta name="description" content="View data source details for {data.project.name}." />
  {/if}
</svelte:head>

<div class="data-source-detail">
  {#if loading}
    <div class="loading">Loading...</div>
  {:else if errorMessage}
    <div class="error">
      <p>{errorMessage}</p>
      {#if needsAuth}
        <button class="auth-button" onclick={authorizeGoogleSheets}>
          Authorize Google Sheets
        </button>
      {/if}
      <a href={`/projects/${data.projectId}/data-sources`}>Back to Data Sources</a>
    </div>
  {:else if dataSource}
    <div class="header">
      <div class="title-area">
        <h1>{dataSource.name}</h1>
        <p class="type">{dataSource.type}</p>
      </div>

      <div class="actions">
        {#if dataSource.googleSheetsUrl}
          <a href={dataSource.googleSheetsUrl} target="_blank" rel="noopener noreferrer" class="open-button">
            Open in Google Sheets
          </a>
        {/if}
        <button class="delete-button" onclick={deleteDataSource}>Delete</button>
      </div>
    </div>

    {#if metadata && metadata.sheets.length > 0}
      <div class="sheet-selector">
        <label for="sheet-select">Sheet:</label>
        <select id="sheet-select" bind:value={selectedSheetIndex}>
          {#each metadata.sheets as sheet, index}
            <option value={index}>{sheet.title}</option>
          {/each}
        </select>
      </div>

      <div class="embed-container">
        <iframe
          src={getEmbedUrl()}
          title={`Google Sheets: ${dataSource.name}`}
          frameborder="0"
          allowfullscreen
        ></iframe>
      </div>

      <div class="info-panel">
        <h3>Sheet Information</h3>
        <dl>
          <dt>Sheet Name:</dt>
          <dd>{metadata.sheets[selectedSheetIndex]?.title}</dd>

          <dt>Rows:</dt>
          <dd>{metadata.sheets[selectedSheetIndex]?.rowCount}</dd>

          <dt>Columns:</dt>
          <dd>{metadata.sheets[selectedSheetIndex]?.columnCount}</dd>

          <dt>Last Updated:</dt>
          <dd>{new Date(dataSource.updatedAt).toLocaleDateString()}</dd>
        </dl>
      </div>
    {/if}
  {/if}
</div>

<style>
  .data-source-detail {
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 12px;
    padding: 2rem;
  }

  .loading,
  .error {
    text-align: center;
    padding: 3rem;
    color: var(--color-muted-teal);
  }

  .error a {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }

  .auth-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    margin: 1rem 0;
    transition: all 0.2s ease;
  }

  .auth-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--color-teal-grey);
  }

  .title-area h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0 0 0.5rem 0;
  }

  .type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }

  .open-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .open-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .delete-button {
    background-color: #e74c3c;
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .delete-button:hover {
    background-color: #c0392b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
  }

  .sheet-selector {
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .sheet-selector label {
    font-weight: 600;
    color: var(--color-sage);
    font-size: 0.875rem;
  }

  .sheet-selector select {
    padding: 0.5rem 1rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 6px;
    font-size: 1rem;
    color: var(--color-sage);
    background-color: white;
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .sheet-selector select:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  .embed-container {
    position: relative;
    width: 100%;
    padding-bottom: 75%; /* 4:3 aspect ratio */
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 2rem;
  }

  .embed-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .info-panel {
    background-color: var(--color-teal-grey);
    padding: 1.5rem;
    border-radius: 8px;
  }

  .info-panel h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0 0 1rem 0;
  }

  .info-panel dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem 1.5rem;
    margin: 0;
  }

  .info-panel dt {
    font-weight: 600;
    color: var(--color-sage);
    font-size: 0.875rem;
  }

  .info-panel dd {
    color: var(--color-muted-teal);
    margin: 0;
    font-size: 0.875rem;
  }
</style>
