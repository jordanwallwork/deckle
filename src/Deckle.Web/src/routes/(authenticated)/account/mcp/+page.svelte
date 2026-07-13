<script lang="ts">
  import type { PageData } from './$types';
  import { Card } from '$lib/components';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import ApiKeysCard from './_components/ApiKeysCard.svelte';
  import { config } from '$lib/config';

  let { data }: { data: PageData } = $props();

  const mcpUrl = `${config.apiUrl}/mcp`;
</script>

<PageHeader>
  <h1>AI Agent Access (MCP)</h1>
</PageHeader>

<div class="page-layout">
  <!-- API Keys -->
  <div class="section">
    <h2>API Keys</h2>
    <ApiKeysCard apiKeys={data.apiKeys} />
  </div>

  <!-- How to connect -->
  <div class="section">
    <h2>How to Connect</h2>
    <Card>
      <p class="prose">
        Deckle exposes a <strong>Model Context Protocol (MCP)</strong> server that lets AI agents
        like Claude create and manage your tabletop game projects. Connect any MCP-compatible
        client using the details below.
      </p>

      <h3>1. Create an API key</h3>
      <p class="prose">
        Generate a key in the section above and copy it somewhere safe — it is only shown once.
      </p>

      <h3>2. MCP server URL</h3>
      <p class="prose">The MCP server runs alongside the Deckle API at:</p>
      <pre class="code-block">{mcpUrl}</pre>

      <h3>3. Configure Claude Desktop</h3>
      <p class="prose">
        Add this block to your <code>claude_desktop_config.json</code>:
      </p>
      <pre class="code-block">{`{
  "mcpServers": {
    "deckle": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": {
        "X-API-Key": "<your-api-key>"
      }
    }
  }
}`}</pre>

      <h3>4. Configure other MCP clients</h3>
      <p class="prose">
        Point any MCP-compatible client at the server URL and set the
        <code>X-API-Key</code> request header to your API key.
      </p>
    </Card>
  </div>

  <!-- Available tools -->
  <div class="section">
    <h2>What Agents Can Do</h2>
    <Card>
      <p class="prose">
        Once connected, an agent has access to the following tools. All operations are scoped to
        your account — agents cannot access other users' projects.
      </p>

      <div class="tool-groups">
        <div class="tool-group">
          <h3>Projects</h3>
          <ul class="tool-list">
            <li><code>list_projects</code> — List all your projects</li>
            <li><code>get_project</code> — Fetch a single project's details</li>
            <li><code>create_project</code> — Create a new project</li>
            <li><code>update_project</code> — Rename, re-describe, or change visibility</li>
            <li><code>delete_project</code> — Permanently delete a project</li>
            <li><code>list_project_members</code> — See who has access</li>
          </ul>
        </div>

        <div class="tool-group">
          <h3>Components</h3>
          <ul class="tool-list">
            <li><code>list_components</code> — List all components in a project</li>
            <li><code>get_component</code> — Fetch component details</li>
            <li><code>create_card</code> — Add a card component (choose from 11 preset sizes)</li>
            <li><code>create_dice</code> — Add dice (D4 → D20, with style and colour)</li>
            <li><code>create_game_board</code> — Add a game board (preset or custom dimensions)</li>
            <li><code>create_player_mat</code> — Add a player mat</li>
            <li><code>delete_component</code> — Remove a component</li>
            <li><code>link_data_source</code> — Attach a data source to a component</li>
          </ul>
        </div>

        <div class="tool-group">
          <h3>Data Sources</h3>
          <ul class="tool-list">
            <li><code>list_data_sources</code> — List data sources in a project</li>
            <li><code>get_data_source</code> — Fetch data source details</li>
            <li>
              <code>create_google_sheets_data_source</code> — Link a public Google Sheet
            </li>
            <li><code>sync_data_source_metadata</code> — Update headers and row count</li>
            <li><code>delete_data_source</code> — Remove a data source</li>
          </ul>
        </div>

        <div class="tool-group">
          <h3>Files (read-only)</h3>
          <ul class="tool-list">
            <li><code>list_files</code> — Browse project assets, optionally filtered by tag</li>
            <li><code>list_directories</code> — Browse the folder hierarchy</li>
            <li><code>list_file_tags</code> — List all tags used in a project</li>
          </ul>
        </div>
      </div>

      <div class="not-supported">
        <strong>Not available via MCP:</strong> design editing, file uploads, and authentication
        flows. These require the visual editor or the web UI.
      </div>
    </Card>
  </div>
</div>

<style>
  .page-layout {
    padding: var(--pad-content);
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0 2rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .page-layout {
      grid-template-columns: 1fr;
    }
  }

  .section {
    margin-bottom: 2.5rem;
  }

  .section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 1rem;
  }

  /* Card prose */
  .prose {
    margin: 0 0 1rem;
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .prose:last-child {
    margin-bottom: 0;
  }

  .prose code,
  .prose code {
    font-family: monospace;
    background: var(--color-bg-subtle, #f0f0f0);
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-size: 0.88em;
  }

  /* Headings inside Card */
  :global(.section) h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 1.25rem 0 0.5rem;
  }

  :global(.section) h3:first-of-type {
    margin-top: 1rem;
  }

  .code-block {
    background: #f8f8f6;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.875rem 1rem;
    font-family: monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    margin: 0 0 1rem;
    color: var(--color-text);
  }

  /* Tool list */
  .tool-groups {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .tool-group h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 1.25rem 0 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .tool-group:first-child h3 {
    margin-top: 0.5rem;
  }

  .tool-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .tool-list li {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .tool-list code {
    font-family: monospace;
    font-size: 0.85em;
    background: var(--color-bg-subtle, #f0f0f0);
    padding: 0.1em 0.35em;
    border-radius: 3px;
    color: var(--color-accent-fg);
    font-weight: 500;
  }

  .not-supported {
    margin-top: 1.5rem;
    padding: 0.75rem 1rem;
    background: #f8f8f6;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
</style>
