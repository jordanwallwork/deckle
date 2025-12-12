<script lang="ts">
  import Dialog from './Dialog.svelte';

  interface Props {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    show = $bindable(),
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonClass = 'primary',
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
    <button class="secondary cancel-button" onclick={handleCancel}>
      {cancelText}
    </button>
    <button class="{confirmButtonClass} confirm-button" onclick={handleConfirm}>
      {confirmText}
    </button>
  {/snippet}
</Dialog>

<style>
  .confirm-message {
    font-size: 1rem;
    color: var(--color-sage);
    line-height: 1.6;
    margin: 0;
  }

  .confirm-button.danger {
    background-color: #d32f2f;
    color: white;
  }

  .confirm-button.danger:hover {
    background-color: #b71c1c;
  }
</style>
