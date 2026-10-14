<script lang="ts">
  import { Badge } from '$lib/components';

  let { role, size = 'md' }: { role: string; size?: 'sm' | 'md' } = $props();
</script>

<Badge variant={role === 'Administrator' ? 'primary' : 'default'} {size}>{role}</Badge>
