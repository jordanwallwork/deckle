<script lang="ts">
  type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  interface AvatarProps {
    src?: string | null;
    name?: string | null;
    size?: AvatarSize;
    class?: string;
  }

  let { src, name, size = 'md', class: className = '' }: AvatarProps = $props();

  const sizeClasses: Record<AvatarSize, string> = {
    xs: 'avatar-xs',
    sm: 'avatar-sm',
    md: 'avatar-md',
    lg: 'avatar-lg',
    xl: 'avatar-xl'
  };

  const initial = $derived((name?.charAt(0) || 'U').toUpperCase());
</script>

{#if src}
  <img {src} alt={name || 'User'} class="avatar {sizeClasses[size]} {className}" />
{:else}
  <div class="avatar-placeholder {sizeClasses[size]} {className}">
    {initial}
  </div>
{/if}

<style>
  .avatar,
  .avatar-placeholder {
    border-radius: 50%;
    flex-shrink: 0;
  }

  .avatar {
    object-fit: cover;
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    background: var(--avatar-bg, var(--color-muted-teal));
    color: var(--avatar-color, white);
    border: var(--avatar-border, none);
  }

  /* Size variants */
  .avatar-xs {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
  }

  .avatar-sm {
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }

  .avatar-md {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .avatar-lg {
    width: 80px;
    height: 80px;
    font-size: 2rem;
  }

  .avatar-xl {
    width: 120px;
    height: 120px;
    font-size: 3rem;
  }
</style>
