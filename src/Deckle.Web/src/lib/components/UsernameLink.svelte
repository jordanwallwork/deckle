<script lang="ts">
  let {
    username,
    class: className = ''
  }: {
    username?: string | null;
    class?: string;
  } = $props();
</script>

{#if username}
  <a href="/@{username}" class="username-link {className}">@{username}</a>
{/if}

<style>
  .username-link {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-decoration: none;
  }

  .username-link:hover {
    text-decoration: underline;
  }
</style>
