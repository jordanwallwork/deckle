<script lang="ts">
  import { templateStore } from '$lib/stores/templateElements';
  import type { ElementType, TemplateElement, ContainerElement } from '../types';

  let {
    isOpen = $bindable(false),
    parentId,
    position
  }: {
    isOpen: boolean;
    parentId: string | null;
    position: { top: number; left: number };
  } = $props();

  function generateId(): string {
    return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function addElement(type: ElementType) {
    const id = generateId();
    const baseElement = {
      id,
      visible: true,
      opacity: 1
    };

    let newElement: TemplateElement;

    switch (type) {
      case 'container':
        newElement = {
          ...baseElement,
          type: 'container',
          display: 'flex',
          flexConfig: {
            direction: 'row',
            wrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'flex-start'
          },
          dimensions: {
            width: '100%',
            height: 100
          },
          padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
          },
          children: []
        } as ContainerElement;
        break;

      case 'text':
        newElement = {
          ...baseElement,
          type: 'text',
          content: 'New Text',
          fontSize: 16,
          color: '#000000'
        };
        break;

      case 'image':
        newElement = {
          ...baseElement,
          type: 'image',
          imageId: '',
          dimensions: { width: 100, height: 100 }
        };
        break;
    }

    templateStore.addElement(newElement, parentId);
    isOpen = false;
  }

  const isRootLevel = $derived(!parentId || parentId === 'root');
</script>

{#if isOpen}
  <div class="add-popover" style="top: {position.top}px; left: {position.left}px;">
    <div class="popover-header">
      Add Element
      {#if isRootLevel}
        <span class="parent-note">(position: absolute)</span>
      {:else}
        <span class="parent-note">(to container)</span>
      {/if}
    </div>
    <button class="popover-item" onclick={() => addElement('container')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
      </svg>
      Container
    </button>
    <button class="popover-item" onclick={() => addElement('text')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M4 3H12M8 3V13M6 13H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      Text
    </button>
    <button class="popover-item" onclick={() => addElement('image')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
        <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
        <path d="M2 11L5 8L8 11L11 8L14 11" stroke="currentColor" stroke-width="1.5" fill="none" />
      </svg>
      Image
    </button>
  </div>
{/if}

<style>
  .add-popover {
    position: fixed;
    background: white;
    border: 1px solid #e5e5e7;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 180px;
    z-index: 1000;
    overflow: hidden;
  }

  .popover-header {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    border-bottom: 1px solid #e5e5e7;
    background: #fafafa;
  }

  .parent-note {
    font-weight: 400;
    color: #999;
    font-size: 0.7rem;
  }

  .popover-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.813rem;
    color: #1a1a1a;
    background: white;
    border: none;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
  }

  .popover-item:hover {
    background: #f5f5f5;
  }
</style>
