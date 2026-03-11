<script lang="ts">
  import type { PageData } from './$types';
  import Avatar from '$lib/components/Avatar.svelte';
  import { marked } from 'marked';

  let { data }: { data: PageData } = $props();

  const { profile } = data;

  const bioHtml = $derived(
    profile.bio ? (marked.parse(profile.bio, { breaks: true, gfm: true }) as string) : ''
  );

  function descriptionHtml(description?: string): string {
    if (!description) return '';
    return marked.parse(description, { breaks: true, gfm: true }) as string;
  }

  const VISIBILITY_LABEL: Record<string, string> = {
    Public: 'Public',
    Teaser: 'Teaser'
  };

  function getFaviconUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
    } catch {
      return '';
    }
  }
</script>

<svelte:head>
  <title>{profile.name ?? profile.username} (@{profile.username}) · Deckle</title>
  <meta
    name="description"
    content={profile.bio
      ? profile.bio.slice(0, 160)
      : `${profile.username}'s public profile on Deckle`}
  />
</svelte:head>

<div class="profile-page">
  <div class="profile-header">
    <Avatar src={profile.picture} name={profile.name ?? profile.username} size="xl" />

    <div class="profile-identity">
      <h1 class="display-name">{profile.name ?? profile.username}</h1>
      <p class="username">@{profile.username}</p>
    </div>
  </div>

  {#if profile.bio}
    <section class="profile-section bio-section">
      <div class="bio-content">
        {@html bioHtml}
      </div>
    </section>
  {/if}

  {#if profile.externalLinks && profile.externalLinks.length > 0}
    <section class="profile-section links-section">
      <ul class="links-list">
        {#each profile.externalLinks as link}
          <li>
            <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" class="link-item">
              <img
                class="link-icon"
                src={getFaviconUrl(link.url)}
                alt=""
                aria-hidden="true"
                width="16"
                height="16"
              />
              <span class="link-label">{link.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="profile-section projects-section">
    <h2>Projects</h2>
    {#if profile.projects.length === 0}
      <p class="no-projects">No public projects yet.</p>
    {:else}
      <ul class="projects-list">
        {#each profile.projects as project}
          <li class="project-card">
            <div class="project-header">
              {#if project.visibility === 'Teaser'}
                <span class="project-name teaser">
                  {project.name}
                </span>
                <span class="visibility-pill teaser">Teaser</span>
              {:else}
                <a href="/projects/{project.ownerUsername}/{project.code}" class="project-name">
                  {project.name}
                </a>
              {/if}
            </div>
            {#if project.description}
              <div class="project-description">
                {@html descriptionHtml(project.description)}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .profile-page {
    max-width: 680px;
    margin: 0 auto;
    padding: 3rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  /* Header */
  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .profile-identity {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .display-name {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-deep-forest, var(--color-sage));
    margin: 0;
    line-height: 1.2;
  }

  .username {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Sections */
  .profile-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .profile-section h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid var(--color-border);
  }

  /* Bio */
  .bio-content {
    font-size: 1rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
  }

  .bio-content :global(p) {
    margin: 0 0 0.75em 0;
  }
  .bio-content :global(p:last-child) {
    margin-bottom: 0;
  }
  .bio-content :global(strong) {
    font-weight: 700;
    color: var(--color-sage);
  }
  .bio-content :global(em) {
    font-style: italic;
  }
  .bio-content :global(a) {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }
  .bio-content :global(a:hover) {
    color: var(--color-sage);
  }
  .bio-content :global(ul),
  .bio-content :global(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  /* Links */
  .links-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .link-item {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.875rem;
    background-color: rgba(120, 160, 131, 0.08);
    border: 1px solid rgba(120, 160, 131, 0.2);
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-sage);
    text-decoration: none;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .link-item:hover {
    background-color: rgba(120, 160, 131, 0.15);
    border-color: rgba(120, 160, 131, 0.4);
  }

  .link-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border-radius: 2px;
  }

  /* Projects */
  .projects-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    overflow: hidden;
  }

  .project-card {
    padding: 1.125rem 1.25rem;
    background: var(--color-bg-secondary, #fff);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .project-card + .project-card {
    border-top: 1px solid var(--color-border);
  }

  .project-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .project-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-sage);
    text-decoration: none;
  }

  .project-name:not(.teaser):hover {
    text-decoration: underline;
  }

  .visibility-pill {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  .visibility-pill.teaser {
    background-color: rgba(255, 177, 66, 0.12);
    color: #b37a00;
  }

  .project-description {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .project-description :global(p) {
    margin: 0 0 0.5em 0;
  }
  .project-description :global(p:last-child) {
    margin-bottom: 0;
  }
  .project-description :global(strong) {
    font-weight: 700;
  }
  .project-description :global(em) {
    font-style: italic;
  }
  .project-description :global(a) {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }
  .project-description :global(ul),
  .project-description :global(ol) {
    margin: 0.25em 0;
    padding-left: 1.25em;
  }

  .no-projects {
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    font-style: italic;
    margin: 0;
  }

  @media (max-width: 600px) {
    .profile-page {
      padding: 2rem 1.25rem;
      gap: 2rem;
    }

    .profile-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .display-name {
      font-size: 1.5rem;
    }
  }
</style>

