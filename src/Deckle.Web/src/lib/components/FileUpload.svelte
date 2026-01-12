<script lang="ts">
  import { filesApi, ApiError } from '$lib/api';
  import Button from './Button.svelte';
  import type { File } from '$lib/types';

  let {
    projectId,
    onUploadComplete
  }: {
    projectId: string;
    onUploadComplete?: (file: File) => void;
  } = $props();

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  let fileInput = $state<HTMLInputElement | null>(null);
  let selectedFile = $state<globalThis.File | null>(null);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let error = $state<string | null>(null);
  let isDragging = $state(false);

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectFile(target.files[0]);
    }
  }

  function selectFile(file: globalThis.File) {
    error = null;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      error = 'Invalid file type. Only images are allowed: JPEG, PNG, GIF, WebP, SVG.';
      selectedFile = null;
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      error = `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please compress the image or select a smaller file.`;
      selectedFile = null;
      return;
    }

    selectedFile = file;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      selectFile(event.dataTransfer.files[0]);
    }
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  function clearSelection() {
    selectedFile = null;
    error = null;
    uploadProgress = 0;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async function uploadFile() {
    if (!selectedFile) return;

    uploading = true;
    error = null;
    uploadProgress = 0;

    try {
      // Phase 1: Request upload URL
      const { fileId, uploadUrl } = await filesApi.requestUploadUrl(projectId, {
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        fileSizeBytes: selectedFile.size
      });

      // Phase 2: Upload to R2 (direct, with progress)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            uploadProgress = Math.round((e.loaded / e.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.setRequestHeader('x-amz-meta-filesize', selectedFile.size.toString());
        xhr.send(selectedFile);
      });

      // Phase 3: Confirm upload
      const uploadedFile = await filesApi.confirmUpload(fileId);

      // Success: clear form and notify parent
      clearSelection();
      onUploadComplete?.(uploadedFile);
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else if (err instanceof Error) {
        error = err.message;
      } else {
        error = 'Upload failed. Please try again.';
      }
    } finally {
      uploading = false;
      uploadProgress = 0;
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
</script>

<div class="file-upload">
  <div
    class="drop-zone"
    class:dragging={isDragging}
    class:has-file={selectedFile !== null}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if !selectedFile}
      <div class="drop-zone-content">
        <svg
          class="upload-icon"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p class="drop-zone-text">Drag and drop an image here, or click to select</p>
        <p class="drop-zone-hint">
          Maximum file size: 50MB. Supported formats: JPEG, PNG, GIF, WebP, SVG
        </p>
        <Button variant="primary" onclick={triggerFileInput}>Select File</Button>
      </div>
    {:else}
      <div class="file-info">
        <div class="file-details">
          <svg
            class="file-icon"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <div class="file-text">
            <p class="file-name">{selectedFile.name}</p>
            <p class="file-size">{formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
        {#if !uploading}
          <div class="file-actions">
            <Button variant="primary" onclick={uploadFile}>Upload</Button>
            <Button variant="secondary" outline onclick={clearSelection}>Cancel</Button>
          </div>
        {/if}
      </div>
    {/if}

    {#if uploading}
      <div class="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {uploadProgress}%"></div>
        </div>
        <p class="progress-text">{uploadProgress}% uploaded</p>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="error-message">
      <svg
        class="error-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{error}</span>
    </div>
  {/if}

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    onchange={handleFileSelect}
    style="display: none;"
  />
</div>

<style>
  .file-upload {
    width: 100%;
  }

  .drop-zone {
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    text-align: center;
    transition: all 0.2s ease;
    background-color: var(--color-background);
  }

  .drop-zone.dragging {
    border-color: var(--color-muted-teal);
    background-color: rgba(120, 160, 131, 0.05);
  }

  .drop-zone.has-file {
    border-style: solid;
    border-color: var(--color-muted-teal);
    background-color: rgba(120, 160, 131, 0.05);
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .upload-icon {
    width: 3rem;
    height: 3rem;
    color: var(--color-muted-teal);
  }

  .drop-zone-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .drop-zone-hint {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .file-details {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .file-icon {
    width: 2.5rem;
    height: 2.5rem;
    color: var(--color-muted-teal);
    flex-shrink: 0;
  }

  .file-text {
    flex: 1;
    text-align: left;
  }

  .file-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    word-break: break-word;
  }

  .file-size {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0.25rem 0 0;
  }

  .file-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .upload-progress {
    margin-top: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 0.5rem;
    background-color: var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: var(--color-muted-teal);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0.5rem 0 0;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background-color: rgba(231, 76, 60, 0.1);
    border: 1px solid #e74c3c;
    border-radius: var(--radius-md);
    color: #e74c3c;
    font-size: 0.875rem;
  }

  .error-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }
</style>
