<script lang="ts">
  import { Card, Button } from "$lib/components";

  let {
    onDeleteClick,
  }: {
    onDeleteClick: () => void;
  } = $props();
</script>

<Card>
  <div class="danger-zone-content">
    <div>
      <h3>Delete Project</h3>
      <p>
        Once you delete a project, there is no going back. Please be
        certain.
      </p>
    </div>
    <Button variant="danger" onclick={onDeleteClick}>
      Delete Project
    </Button>
  </div>
</Card>

<style>
  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  p {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .danger-zone-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    .danger-zone-content {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
