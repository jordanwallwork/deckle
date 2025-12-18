<script lang="ts">
  import type { PageData } from "./$types";
  import { config } from "$lib/config";
  import { onMount } from "svelte";
  import { Card, Dialog, Button, EmptyState } from "$lib/components";
  import { getBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildDataSourcesBreadcrumbs } from "$lib/utils/breadcrumbs";

  let { data }: { data: PageData } = $props();

  // Update breadcrumbs for this page
  const breadcrumbs = getBreadcrumbs();
  $effect(() => {
    breadcrumbs.set(
      buildDataSourcesBreadcrumbs(data.project.id, data.project.name)
    );
  });

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

  let dataSources = $state<DataSource[]>([]);
  let loading = $state(true);
  let showAddModal = $state(false);
  let newSourceUrl = $state("");
  let newSourceName = $state("");
  let addingSource = $state(false);
  let errorMessage = $state("");
  let isGoogleSheetsAuthorized = $state(false);
  let checkingAuth = $state(true);

  onMount(async () => {
    await checkGoogleSheetsAuth();
    await loadDataSources();
  });

  async function checkGoogleSheetsAuth() {
    try {
      checkingAuth = true;
      const response = await fetch(
        `${config.apiUrl}/google-sheets-auth/status`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        isGoogleSheetsAuthorized = data.authorized;
      }
    } catch (error) {
      console.error("Failed to check Google Sheets authorization:", error);
    } finally {
      checkingAuth = false;
    }
  }

  async function loadDataSources() {
    try {
      loading = true;
      const response = await fetch(
        `${config.apiUrl}/data-sources/project/${data.project.id}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        dataSources = await response.json();
      }
    } catch (error) {
      console.error("Failed to load data sources:", error);
    } finally {
      loading = false;
    }
  }

  async function addDataSource() {
    if (!newSourceUrl.trim()) {
      errorMessage = "Please enter a Google Sheets URL";
      return;
    }

    try {
      addingSource = true;
      errorMessage = "";

      const response = await fetch(`${config.apiUrl}/data-sources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectId: data.project.id,
          name: newSourceName.trim() || "",
          url: newSourceUrl.trim(),
        }),
      });

      if (response.ok) {
        const newSource = await response.json();
        dataSources = [...dataSources, newSource];
        showAddModal = false;
        newSourceUrl = "";
        newSourceName = "";
      } else {
        const error = await response.json();
        errorMessage = error.error || "Failed to add data source";
      }
    } catch (error) {
      console.error("Failed to add data source:", error);
      errorMessage = "Failed to add data source. Please try again.";
    } finally {
      addingSource = false;
    }
  }

  async function deleteDataSource(id: string) {
    if (!confirm("Are you sure you want to delete this data source?")) {
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/data-sources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        dataSources = dataSources.filter((ds) => ds.id !== id);
      }
    } catch (error) {
      console.error("Failed to delete data source:", error);
    }
  }

  function openAddModal() {
    if (!isGoogleSheetsAuthorized) {
      authorizeGoogleSheets();
      return;
    }

    showAddModal = true;
    errorMessage = "";
    newSourceUrl = "";
    newSourceName = "";
  }

  function authorizeGoogleSheets() {
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `${config.apiUrl}/google-sheets-auth/authorize?returnUrl=${returnUrl}`;
  }
</script>

<svelte:head>
  <title>Data Sources · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Connect Google Sheets and other data sources to {data.project
      .name}. Link spreadsheets to populate your game components with data."
  />
</svelte:head>

<div class="tab-content">
  <div class="tab-actions">
    <Button variant="primary" size="sm" onclick={openAddModal}>
      {isGoogleSheetsAuthorized
        ? "+ Add Data Source"
        : "Authorize Google Sheets"}
    </Button>
  </div>

  {#if !isGoogleSheetsAuthorized && !checkingAuth}
    <div class="auth-banner">
      <p class="banner-title">🔐 Google Sheets Authorization Required</p>
      <p class="banner-text">
        To add Google Sheets as a data source, you need to authorize Deckle to
        access your spreadsheets. Click the button above to connect your Google
        account.
      </p>
    </div>
  {/if}

  {#if loading}
    <EmptyState title="Loading..." border={false} />
  {:else if dataSources.length === 0}
    <EmptyState
      title="No data sources yet"
      subtitle="Connect data sources to populate your game components"
      border={false}
    />
  {:else}
    <div class="data-sources-list">
      {#each dataSources as source}
        <Card>
          <div class="card-content">
            <div class="source-info">
              <h3>{source.name}</h3>
              <p class="source-type">{source.type}</p>
              {#if source.googleSheetsUrl}
                <a
                  href={source.googleSheetsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="source-link"
                >
                  Open in Google Sheets →
                </a>
              {/if}
            </div>
            <div class="source-actions">
              <a
                href={`/projects/${data.project.id}/data-sources/${source.id}`}
                style="text-decoration: none;"
              >
                <Button variant="primary" size="sm">View</Button>
              </a>
              <Button
                variant="danger"
                size="sm"
                onclick={() => deleteDataSource(source.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Dialog
  bind:show={showAddModal}
  title="Add Google Sheets Data Source"
  onclose={() => (showAddModal = false)}
>
  {#if errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}

  <div class="form-group">
    <label for="source-url">Google Sheets URL *</label>
    <input
      id="source-url"
      type="url"
      bind:value={newSourceUrl}
      placeholder="https://docs.google.com/spreadsheets/d/..."
      disabled={addingSource}
    />
  </div>

  <div class="form-group">
    <label for="source-name">Name (optional)</label>
    <input
      id="source-name"
      type="text"
      bind:value={newSourceName}
      placeholder="Leave empty to use spreadsheet title"
      disabled={addingSource}
    />
  </div>

  {#snippet actions()}
    <Button
      variant="secondary"
      onclick={() => (showAddModal = false)}
      disabled={addingSource}
    >
      Cancel
    </Button>
    <Button variant="primary" onclick={addDataSource} disabled={addingSource}>
      {addingSource ? "Adding..." : "Add Data Source"}
    </Button>
  {/snippet}
</Dialog>

<style>
  .tab-content {
    min-height: 400px;
  }

  .tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .auth-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .banner-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .banner-text {
    font-size: 0.875rem;
    margin: 0;
    opacity: 0.95;
    line-height: 1.5;
  }

  .data-sources-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .source-info h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 0.5rem 0;
  }

  .source-type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0 0 0.5rem 0;
  }

  .source-link {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .source-link:hover {
    color: var(--color-sage);
  }

  .source-actions {
    display: flex;
    gap: 0.75rem;
  }

  .error-message {
    background-color: #fee;
    border: 1px solid #fcc;
    color: #c00;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  .form-group input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
</style>
