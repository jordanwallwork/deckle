<script lang="ts">
  import Dialog from './Dialog.svelte';
  import Button from './Button.svelte';
  import type { ButtonVariant } from '$lib/types';

  interface Props {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: ButtonVariant;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    show = $bindable(),
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    onconfirm,
    oncancel
  }: Props = $props();

  function handleConfirm() {
    onconfirm();
  }

  function handleCancel() {
    oncancel();
  }
</script>

<Dialog bind:show {title} maxWidth="500px" onclose={handleCancel}>
  <p class="confirm-message">{message}</p>

  {#snippet actions()}
    <Button variant="secondary" onclick={handleCancel}>
      {cancelText}
    </Button>
    <Button variant={confirmVariant} onclick={handleConfirm}>
      {confirmText}
    </Button>
  {/snippet}
</Dialog>

<style>
  .confirm-message {
    font-size: 1rem;
    color: var(--color-sage);
    line-height: 1.6;
    margin: 0;
  }
</style>
