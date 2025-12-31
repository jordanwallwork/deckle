<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import Button from "./Button.svelte";

  let {
    show = $bindable(false),
    itemName,
    itemType = "item",
    onConfirm,
    onCancel,
    isDeleting = false
  }: {
    show: boolean;
    itemName: string;
    itemType?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    isDeleting?: boolean;
  } = $props();

  let confirmationText = $state("");
  let errorMessage = $state("");

  $effect(() => {
    if (!show) {
      // Reset state when dialog closes
      confirmationText = "";
      errorMessage = "";
    }
  });

  function handleClose() {
    if (!isDeleting) {
      show = false;
      onCancel?.();
    }
  }

  async function handleConfirm() {
    if (confirmationText !== itemName) {
      errorMessage = `${itemType} name does not match`;
      return;
    }

    errorMessage = "";
    await onConfirm();
  }

  const isConfirmDisabled = $derived(isDeleting || confirmationText !== itemName);
</script>

<Dialog
  bind:show
  title="Delete {itemType}"
  maxWidth="500px"
  onclose={handleClose}
>
  <div class="delete-dialog-content">
    <p class="warning-text">
      This action cannot be undone. This will permanently delete
      <strong>{itemName}</strong> and all of its data.
    </p>

    <p>Please type <strong>{itemName}</strong> to confirm:</p>

    <input
      type="text"
      bind:value={confirmationText}
      placeholder="Enter {itemType} name"
      disabled={isDeleting}
      class="confirmation-input"
    />

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  </div>

  {#snippet actions()}
    <Button
      variant="secondary"
      onclick={handleClose}
      disabled={isDeleting}
    >
      Cancel
    </Button>
    <Button
      variant="danger"
      onclick={handleConfirm}
      disabled={isConfirmDisabled}
    >
      {isDeleting ? "Deleting..." : `Delete ${itemType}`}
    </Button>
  {/snippet}
</Dialog>

<style>
  .delete-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .warning-text {
    color: var(--color-text, #333);
    line-height: 1.6;
    margin: 0;
  }

  .delete-dialog-content p {
    margin: 0;
  }

  .confirmation-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: 8px;
    background: var(--color-background, white);
    color: var(--color-text, #333);
    font-family: inherit;
    box-sizing: border-box;
  }

  .confirmation-input:focus {
    outline: none;
    border-color: var(--color-danger, #d32f2f);
  }

  .confirmation-input:disabled {
    background-color: #f5f5f5;
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    padding: 0.75rem;
    background-color: #ffebee;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }
</style>
