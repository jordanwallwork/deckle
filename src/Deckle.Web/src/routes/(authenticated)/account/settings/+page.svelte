<script lang="ts">
  import type { PageData } from './$types';
  import { Avatar, Button } from '$lib/components';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import { authApi, ApiError } from '$lib/api';
  import type { ExternalLink } from '$lib/types';
  import { marked } from 'marked';

  let { data }: { data: PageData } = $props();

  // Bio state
  let bio = $state(data.user.bio ?? '');
  let bioPreview = $state(false);
  const MAX_BIO = 1000;
  const bioRemaining = $derived(MAX_BIO - bio.length);
  const bioHtml = $derived(
    marked.parse(bio, { breaks: true, gfm: true }) as string
  );

  // External links state
  let links = $state<ExternalLink[]>(
    data.user.externalLinks ? [...data.user.externalLinks] : []
  );

  function addLink() {
    links = [...links, { label: '', url: '' }];
  }

  function removeLink(index: number) {
    links = links.filter((_, i) => i !== index);
  }

  function updateLinkLabel(index: number, value: string) {
    links = links.map((l, i) => (i === index ? { ...l, label: value } : l));
  }

  function updateLinkUrl(index: number, value: string) {
    links = links.map((l, i) => (i === index ? { ...l, url: value } : l));
  }

  // Save state
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state(false);

  async function saveProfile() {
    saving = true;
    saveError = null;
    saveSuccess = false;

    try {
      await authApi.updateProfile({
        bio: bio.trim() || null,
        externalLinks: links.filter((l) => l.label.trim() && l.url.trim())
      });
      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (err) {
      saveError = err instanceof ApiError ? err.message : 'Failed to save profile';
    } finally {
      saving = false;
    }
  }
</script>

<PageHeader>
  <h1>Account Settings</h1>
</PageHeader>

<div class="settings-section">
  <h2>Profile Information</h2>

  <section>
    <Avatar src={data.user.picture} name={data.user.name} size="xl" class="profile-avatar" />

    <dl class="profile-fields">
      <div class="field-group">
        <dt class="field-label">Username</dt>
        <dd class="field-value">{data.user.username}</dd>
      </div>

      <div class="field-group">
        <dt class="field-label">Name</dt>
        <dd class="field-value">{data.user.name}</dd>
      </div>

      <div class="field-group">
        <dt class="field-label">Email</dt>
        <dd class="field-value">{data.user.email}</dd>
      </div>
    </dl>
  </section>
</div>

<div class="settings-section">
  <h2>Public Profile</h2>

  <div class="editable-fields">
    <div class="field-group">
      <div class="bio-header">
        <label class="field-label" for="bio">Bio</label>
        <div class="bio-controls">
          <span class="char-count" class:warning={bioRemaining < 100} class:error={bioRemaining < 0}>
            {bioRemaining} characters remaining
          </span>
          <button
            type="button"
            class="toggle-preview"
            onclick={() => (bioPreview = !bioPreview)}
          >
            {bioPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {#if bioPreview}
        <div class="bio-preview">
          {#if bio.trim()}
            {@html bioHtml}
          {:else}
            <span class="empty-preview">Nothing to preview yet.</span>
          {/if}
        </div>
      {:else}
        <textarea
          id="bio"
          class="bio-textarea"
          placeholder="Tell others about yourself. Markdown formatting supported: **bold**, *italic*, [links](https://...)"
          maxlength={MAX_BIO}
          rows={6}
          bind:value={bio}
        ></textarea>
        <p class="bio-hint">Supports basic Markdown: **bold**, *italic*, [text](url)</p>
      {/if}
    </div>

    <div class="field-group">
      <label class="field-label">External Links</label>
      <p class="links-hint">Add links to your portfolio, social media, or tip jars (e.g. Ko-fi, Patreon).</p>

      <div class="links-list">
        {#each links as link, i}
          <div class="link-row">
            <input
              type="text"
              class="link-input link-label"
              placeholder="Label (e.g. Ko-fi, Portfolio, X)"
              maxlength="50"
              value={link.label}
              oninput={(e) => updateLinkLabel(i, (e.target as HTMLInputElement).value)}
            />
            <input
              type="url"
              class="link-input link-url"
              placeholder="https://..."
              maxlength="500"
              value={link.url}
              oninput={(e) => updateLinkUrl(i, (e.target as HTMLInputElement).value)}
            />
            <button
              type="button"
              class="remove-link"
              aria-label="Remove link"
              onclick={() => removeLink(i)}
            >
              &times;
            </button>
          </div>
        {/each}
      </div>

      {#if links.length < 8}
        <Button variant="secondary" size="sm" onclick={addLink}>
          + Add Link
        </Button>
      {/if}
    </div>

    <div class="save-row">
      {#if saveError}
        <p class="save-error">{saveError}</p>
      {/if}
      {#if saveSuccess}
        <p class="save-success">Profile saved.</p>
      {/if}
      <Button variant="primary" disabled={saving || bioRemaining < 0} onclick={saveProfile}>
        {saving ? 'Saving…' : 'Save Profile'}
      </Button>
    </div>
  </div>
</div>

<style>
  .settings-section {
    padding: 2rem;
  }

  .settings-section + .settings-section {
    border-top: 1px solid rgba(120, 160, 131, 0.2);
  }

  .settings-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 1.5rem 0;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-fields {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 0;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    margin: 0;
  }

  .field-value {
    font-size: 1rem;
    color: var(--color-deep-forest);
    padding: 0.75rem 1rem;
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
    margin: 0;
  }

  @media (min-width: 640px) {
    section {
      flex-direction: row;
      align-items: flex-start;
      gap: 3rem;
    }

    .profile-fields {
      flex: 1;
    }
  }

  /* Editable fields */
  .editable-fields {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 640px;
  }

  /* Bio */
  .bio-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .bio-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .char-count {
    font-size: 0.8125rem;
    color: var(--color-sage);
  }

  .char-count.warning {
    color: #d97706;
  }

  .char-count.error {
    color: #dc2626;
    font-weight: 600;
  }

  .toggle-preview {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-muted-teal);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  .toggle-preview:hover {
    color: var(--color-sage);
  }

  .bio-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    font-size: 0.9375rem;
    font-family: inherit;
    color: var(--color-deep-forest);
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
    resize: vertical;
    line-height: 1.6;
  }

  .bio-textarea:focus {
    outline: none;
    border-color: var(--color-muted-teal);
    box-shadow: 0 0 0 3px rgba(120, 160, 131, 0.15);
  }

  .bio-preview {
    padding: 0.75rem 1rem;
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
    font-size: 0.9375rem;
    color: var(--color-deep-forest);
    line-height: 1.6;
    min-height: 6rem;
  }

  .bio-preview :global(p) {
    margin: 0 0 0.75em 0;
  }

  .bio-preview :global(p:last-child) {
    margin-bottom: 0;
  }

  .bio-preview :global(strong) {
    font-weight: 700;
  }

  .bio-preview :global(em) {
    font-style: italic;
  }

  .bio-preview :global(a) {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }

  .bio-preview :global(ul),
  .bio-preview :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .empty-preview {
    color: rgba(120, 160, 131, 0.6);
    font-style: italic;
  }

  .bio-hint {
    font-size: 0.8125rem;
    color: rgba(120, 160, 131, 0.8);
    margin: 0;
  }

  /* External links */
  .links-hint {
    font-size: 0.875rem;
    color: var(--color-sage);
    margin: 0;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .link-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .link-input {
    padding: 0.625rem 0.875rem;
    font-size: 0.9375rem;
    font-family: inherit;
    color: var(--color-deep-forest);
    background-color: rgba(120, 160, 131, 0.05);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 8px;
    min-width: 0;
  }

  .link-input:focus {
    outline: none;
    border-color: var(--color-muted-teal);
    box-shadow: 0 0 0 3px rgba(120, 160, 131, 0.15);
  }

  .link-label {
    flex: 0 0 160px;
  }

  .link-url {
    flex: 1;
  }

  .remove-link {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 6px;
    color: #dc2626;
    font-size: 1.125rem;
    cursor: pointer;
    line-height: 1;
  }

  .remove-link:hover {
    background-color: rgba(220, 38, 38, 0.08);
  }

  /* Save row */
  .save-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .save-error {
    font-size: 0.875rem;
    color: #dc2626;
    margin: 0;
  }

  .save-success {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    font-weight: 600;
    margin: 0;
  }
</style>
