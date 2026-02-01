import { writable, type Writable } from 'svelte/store';
import type { TemplateElement, ContainerElement } from '$lib/components/editor/types';

export interface TemplateStore {
  root: ContainerElement;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
}

interface HistoryState {
  root: ContainerElement;
  selectedElementId: string | null;
}

const MAX_HISTORY_SIZE = 50;

function createTemplateStore() {
  const initialRoot: ContainerElement = {
    id: 'root',
    type: 'container',
    position: 'relative',
    display: 'flex',
    flexConfig: {
      direction: 'column',
      wrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    },
    children: [],
    visibilityMode: 'show',
    opacity: 1,
    bleedAreaColor: '#ff0000', // Default red for bleed area
    safeAreaColor: '#00ff00' // Default green for safe area
  };

  const { subscribe, update, set } = writable<TemplateStore>({
    root: initialRoot,
    selectedElementId: null,
    hoveredElementId: null,
    canUndo: false,
    canRedo: false,
    hasUnsavedChanges: false
  });

  // History stacks for undo/redo
  let past: HistoryState[] = [];
  let future: HistoryState[] = [];

  // Helper to save current state to history before mutation
  function saveHistory(store: TemplateStore) {
    past.push({
      root: structuredClone(store.root),
      selectedElementId: store.selectedElementId
    });
    if (past.length > MAX_HISTORY_SIZE) {
      past.shift();
    }
    future = []; // Clear future when new change is made
    store.canUndo = past.length > 0;
    store.canRedo = false;
    store.hasUnsavedChanges = true; // Mark as having unsaved changes
  }

  return {
    subscribe,
    set,
    update,

    // Add an element to a parent (or root if parentId is null)
    addElement: (element: TemplateElement, parentId: string | null = null) => {
      update((store) => {
        saveHistory(store);
        // Enforce absolute positioning for root-level elements
        if (!parentId || parentId === 'root') {
          element.position = 'absolute';
          if (element.x === undefined) element.x = 0;
          if (element.y === undefined) element.y = 0;
          // Create new root with new children array
          store.root = {
            ...store.root,
            children: [...store.root.children, element]
          };
        } else {
          // Children of containers use relative positioning by default
          if (element.position === undefined) {
            element.position = 'relative';
          }
          // Use immutable update to create new references for entire path
          store.root = addElementToContainer(store.root, parentId, element);
        }
        // Auto-select the newly added element
        store.selectedElementId = element.id;

        return store;
      });
    },

    // Remove an element by ID
    removeElement: (elementId: string) => {
      update((store) => {
        saveHistory(store);
        const result = removeElementFromContainer(store.root, elementId);
        if (result.removed) {
          store.root = result.container;
          if (store.selectedElementId === elementId) {
            store.selectedElementId = null;
          }
        }
        return store;
      });
    },

    // Update an element
    updateElement: (elementId: string, updates: Partial<TemplateElement>) => {
      update((store) => {
        saveHistory(store);
        store.root = updateElementInContainer(store.root, elementId, updates);
        return store;
      });
    },

    // Update an element without saving to history (useful for batched operations like drag)
    updateElementWithoutHistory: (elementId: string, updates: Partial<TemplateElement>) => {
      update((store) => {
        store.root = updateElementInContainer(store.root, elementId, updates);
        return store;
      });
    },

    // Save current state to history (useful for manual history management)
    saveToHistory: () => {
      update((store) => {
        saveHistory(store);
        return store;
      });
    },

    // Select an element
    selectElement: (elementId: string | null) => {
      update((store) => {
        store.selectedElementId = elementId;
        return store;
      });
    },

    // Set hovered element
    setHoveredElement: (elementId: string | null) => {
      update((store) => {
        store.hoveredElementId = elementId;
        return store;
      });
    },

    // Get an element by ID
    getElement: (elementId: string): TemplateElement | null => {
      let element: TemplateElement | null = null;
      subscribe((store) => {
        element = findElementById(store.root, elementId);
      })();
      return element;
    },

    // Reset to initial state
    reset: () => {
      set({
        root: initialRoot,
        selectedElementId: null,
        hoveredElementId: null,
        canUndo: false,
        canRedo: false,
        hasUnsavedChanges: false
      });
      past = [];
      future = [];
    },

    // Undo the last change
    undo: () => {
      if (past.length === 0) return;

      update((store) => {
        const previousState = past.pop()!;
        future.push({
          root: structuredClone(store.root),
          selectedElementId: store.selectedElementId
        });
        store.root = structuredClone(previousState.root);
        store.selectedElementId = previousState.selectedElementId;
        store.canUndo = past.length > 0;
        store.canRedo = true;
        store.hasUnsavedChanges = true; // Mark as having unsaved changes
        return store;
      });
    },

    // Redo the last undone change
    redo: () => {
      if (future.length === 0) return;

      update((store) => {
        const nextState = future.pop()!;
        past.push({
          root: structuredClone(store.root),
          selectedElementId: store.selectedElementId
        });
        store.root = structuredClone(nextState.root);
        store.selectedElementId = nextState.selectedElementId;
        store.canUndo = true;
        store.canRedo = future.length > 0;
        store.hasUnsavedChanges = true; // Mark as having unsaved changes
        return store;
      });
    },

    // Move an element to a new parent
    moveElement: (elementId: string, newParentId: string | null, insertIndex?: number) => {
      update((store) => {
        // Find the element
        const element = findElementById(store.root, elementId);
        if (!element) return store;

        // Don't allow moving to itself or to its own descendants
        if (elementId === newParentId) return store;
        if (element.type === 'container') {
          const descendant = findElementById(element, newParentId || '');
          if (descendant) return store;
        }

        // Validate that the new parent is a container or root
        if (newParentId && newParentId !== 'root') {
          const targetParent = findElementById(store.root, newParentId);
          if (!targetParent || targetParent.type !== 'container') {
            // Target is not a container, abort the move
            return store;
          }
        }

        saveHistory(store);

        // Remove from current parent
        const removeResult = removeElementFromContainer(store.root, elementId);
        if (!removeResult.removed) return store;

        store.root = removeResult.container;

        // Update positioning based on new parent
        const movedElement = structuredClone(element);
        if (!newParentId || newParentId === 'root') {
          // Moving to root - enforce absolute positioning
          movedElement.position = 'absolute';
          if (movedElement.x === undefined) movedElement.x = 0;
          if (movedElement.y === undefined) movedElement.y = 0;
          store.root = {
            ...store.root,
            children: insertAtIndex(store.root.children, movedElement, insertIndex)
          };
        } else {
          // Moving to a container - use relative positioning
          if (movedElement.position === 'absolute') {
            movedElement.position = 'relative';
            delete movedElement.x;
            delete movedElement.y;
          }
          store.root = addElementToContainer(store.root, newParentId, movedElement, insertIndex);
        }

        return store;
      });
    },

    // Duplicate an element
    duplicateElement: (elementId: string) => {
      update((store) => {
        // Find the element and its parent
        const element = findElementById(store.root, elementId);
        if (!element) return store;

        // Find parent and insertion index
        const parentInfo = findParentAndIndex(store.root, elementId);
        if (!parentInfo) return store;

        saveHistory(store);

        // Create a deep copy with new IDs
        const duplicatedElement = duplicateElementWithNewIds(element);

        // Insert after the original element
        const insertIndex = parentInfo.index + 1;
        if (parentInfo.parentId === 'root') {
          store.root = {
            ...store.root,
            children: insertAtIndex(store.root.children, duplicatedElement, insertIndex)
          };
        } else {
          store.root = addElementToContainer(
            store.root,
            parentInfo.parentId,
            duplicatedElement,
            insertIndex
          );
        }

        // Select the duplicated element
        store.selectedElementId = duplicatedElement.id;

        return store;
      });
    },

    // Mark changes as saved
    markAsSaved: () => {
      update((store) => {
        store.hasUnsavedChanges = false;
        return store;
      });
    },

    // Update font metadata in the root container
    updateFontMetadata: (family: string, category: string) => {
      update((store) => {
        // Initialize fonts array if it doesn't exist
        const currentFonts = store.root.fonts || [];

        // Check if font already exists in the array
        const existingFontIndex = currentFonts.findIndex((f) => f.family === family);

        if (existingFontIndex === -1) {
          // Add new font to the array
          store.root = {
            ...store.root,
            fonts: [
              ...currentFonts,
              {
                family,
                category
              }
            ]
          };
        }
        // Note: We don't save to history for font metadata updates
        // as they happen automatically when fonts are used
        return store;
      });
    }
  };
}

// Helper function to find an element by ID in the tree
function findElementById(element: TemplateElement, targetId: string): TemplateElement | null {
  if (element.id === targetId) {
    return element;
  }

  if (element.type === 'container') {
    for (const child of element.children) {
      const found = findElementById(child, targetId);
      if (found) return found;
    }
  }

  return null;
}

// Helper function to insert element at specific index (or end if undefined)
function insertAtIndex(
  children: TemplateElement[],
  element: TemplateElement,
  index?: number
): TemplateElement[] {
  if (index === undefined || index < 0 || index >= children.length) {
    return [...children, element];
  }
  return [...children.slice(0, index), element, ...children.slice(index)];
}

// Helper function to add element immutably (creates new references for the entire path)
function addElementToContainer(
  container: ContainerElement,
  parentId: string,
  element: TemplateElement,
  insertIndex?: number
): ContainerElement {
  if (container.id === parentId) {
    // Found the parent - add element here
    return {
      ...container,
      children: insertAtIndex(container.children, element, insertIndex)
    };
  }

  // Recursively search and update children
  const newChildren = container.children.map((child: TemplateElement) => {
    if (child.type === 'container') {
      const found = findElementById(child, parentId);
      if (found) {
        return addElementToContainer(child, parentId, element, insertIndex);
      }
    }
    return child;
  });

  // Return new container with potentially updated children
  return {
    ...container,
    children: newChildren
  };
}

// Helper function to remove an element by ID immutably
function removeElementFromContainer(
  container: ContainerElement,
  targetId: string
): { container: ContainerElement; removed: boolean } {
  // Check if target is in direct children
  const hasChild = container.children.some((child: TemplateElement) => child.id === targetId);
  if (hasChild) {
    return {
      container: {
        ...container,
        children: container.children.filter((child: TemplateElement) => child.id !== targetId)
      },
      removed: true
    };
  }

  // Recursively search in nested containers
  let removed = false;
  const newChildren = container.children.map((child: TemplateElement) => {
    if (!removed && child.type === 'container') {
      const found = findElementById(child, targetId);
      if (found) {
        const result = removeElementFromContainer(child, targetId);
        removed = result.removed;
        return result.container;
      }
    }
    return child;
  });

  return {
    container: removed ? { ...container, children: newChildren } : container,
    removed
  };
}

// Helper function to update an element immutably
function updateElementInContainer(
  container: ContainerElement,
  targetId: string,
  updates: Partial<TemplateElement>
): ContainerElement {
  if (container.id === targetId) {
    return { ...container, ...updates } as ContainerElement;
  }

  const newChildren = container.children.map((child: TemplateElement): TemplateElement => {
    if (child.id === targetId) {
      return { ...child, ...updates } as TemplateElement;
    }
    if (child.type === 'container') {
      const found = findElementById(child, targetId);
      if (found) {
        return updateElementInContainer(child, targetId, updates);
      }
    }
    return child;
  });

  return {
    ...container,
    children: newChildren
  };
}

// Helper function to find parent and index of an element
function findParentAndIndex(
  container: ContainerElement,
  targetId: string,
  parentId: string = 'root'
): { parentId: string; index: number } | null {
  // Check if target is in direct children
  const index = container.children.findIndex((child: TemplateElement) => child.id === targetId);
  if (index !== -1) {
    return { parentId, index };
  }

  // Recursively search in nested containers
  for (const child of container.children) {
    if (child.type === 'container') {
      const found = findParentAndIndex(child, targetId, child.id);
      if (found) return found;
    }
  }

  return null;
}

// Helper function to duplicate an element with new IDs
function duplicateElementWithNewIds(element: TemplateElement): TemplateElement {
  const newId = crypto.randomUUID();
  const duplicated = structuredClone(element);
  duplicated.id = newId;

  // If element has a custom label, add "Copy" suffix
  if (duplicated.label) {
    duplicated.label = `${duplicated.label} Copy`;
  }

  // Offset position slightly for absolute positioned elements
  if (duplicated.position === 'absolute') {
    if (duplicated.x !== undefined && typeof duplicated.x === 'number') {
      duplicated.x += 20;
    }
    if (duplicated.y !== undefined && typeof duplicated.y === 'number') {
      duplicated.y += 20;
    }
  }

  // Recursively update IDs of children
  if (duplicated.type === 'container' && duplicated.children) {
    duplicated.children = duplicated.children.map((child: TemplateElement) =>
      duplicateElementWithNewIds(child)
    );
  }

  return duplicated;
}

export const templateStore = createTemplateStore();
