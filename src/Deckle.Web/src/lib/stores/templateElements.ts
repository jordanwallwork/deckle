import { writable, derived } from 'svelte/store';
import type {
  TemplateElement,
  ContainerElement,
  IteratorElement,
  ShapeElement,
  GridElement
} from '$lib/components/editor/types';

type ParentElement = ContainerElement | IteratorElement | ShapeElement | GridElement;

/** Type guard for elements with children arrays (container, iterator, shape, or grid). */
function hasChildren(element: TemplateElement): element is ParentElement {
  return element.type === 'container' || element.type === 'iterator' || element.type === 'shape' || element.type === 'grid';
}

/** Whether moving `element` (with id `elementId`) under `newParentId` is a legal move. */
function isValidMoveTarget(
  root: ContainerElement,
  element: TemplateElement,
  elementId: string,
  newParentId: string | null
): boolean {
  // Don't allow moving to itself or to its own descendants
  if (elementId === newParentId) return false;
  if (hasChildren(element) && findElementById(element, newParentId || '')) {
    return false;
  }

  // Validate that the new parent is a container, iterator, or root
  if (newParentId && newParentId !== 'root') {
    const targetParent = findElementById(root, newParentId);
    if (!targetParent || !hasChildren(targetParent)) {
      return false;
    }
  }

  // Iterators can only be placed inside containers, shapes, or grids (not root, not other iterators)
  if (element.type === 'iterator') {
    if (!newParentId || newParentId === 'root') return false;
    const targetParent = findElementById(root, newParentId);
    if (!targetParent || (targetParent.type !== 'container' && targetParent.type !== 'shape' && targetParent.type !== 'grid')) {
      return false;
    }
  }

  return true;
}

/** Adjusts positioning fields on a moved element based on its new parent (root vs. container). */
function repositionMovedElement<T extends TemplateElement>(movedElement: T, newParentId: string | null): T {
  if (!newParentId || newParentId === 'root') {
    // Moving to root - enforce absolute positioning
    movedElement.position = 'absolute';
    if (movedElement.x === undefined) movedElement.x = 0;
    if (movedElement.y === undefined) movedElement.y = 0;
  } else if (movedElement.position === 'absolute') {
    // Moving to a container - use relative positioning
    movedElement.position = 'relative';
    delete movedElement.x;
    delete movedElement.y;
  }

  return movedElement;
}

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
  // Unset-first (ADR-0001 D4): cosmetic styling defaults (display, flexConfig,
  // opacity, visibilityMode) are not stamped on the root. The root's own
  // display/flex/opacity/visibility are never read at render time — only its
  // background, bleed/safe colors, and children are — so omitting them has no
  // visible effect; if the root were ever rendered as a container, the
  // container renderer resolves the same effective defaults.
  const initialRoot: ContainerElement = {
    id: 'root',
    type: 'container',
    position: 'relative',
    children: [],
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

  // Key of the in-progress edit session (element+property scoped). Consecutive
  // updates carrying the same key collapse into a single history entry; the
  // session is sealed (set back to null) on blur/pointer-up, a different key, a
  // selection change, or any structural operation.
  let currentSessionKey: string | null = null;

  // Ends any in-progress edit session so the next keyed update starts fresh.
  function sealSession() {
    currentSessionKey = null;
  }

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
        sealSession();
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
        sealSession();
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

    // Update an element.
    //
    // When `sessionKey` is provided, consecutive updates carrying the same key
    // collapse into a single undo step (an edit session — e.g. one drag gesture
    // or one multi-keystroke text edit). The store still updates live so the
    // canvas previews continuously; only the history is batched. Passing no key
    // (or a different key) seals the previous session and records a new entry.
    updateElement: (
      elementId: string,
      updates: Partial<TemplateElement>,
      sessionKey?: string
    ) => {
      update((store) => {
        const continuesSession = sessionKey != null && sessionKey === currentSessionKey;
        if (!continuesSession) {
          saveHistory(store);
          currentSessionKey = sessionKey ?? null;
        } else {
          // Batched into the open session: no new history entry, but the change
          // is still unsaved.
          store.hasUnsavedChanges = true;
        }
        store.root = updateElementInContainer(store.root, elementId, updates);
        return store;
      });
    },

    // Seal any in-progress edit session (call on blur / pointer-up) so the next
    // keyed update begins a fresh undo step.
    sealSession,

    // Select an element
    selectElement: (elementId: string | null) => {
      update((store) => {
        sealSession();
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
      currentSessionKey = null;
    },

    // Undo the last change
    undo: () => {
      if (past.length === 0) return;
      sealSession();

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
      sealSession();

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
        const element = findElementById(store.root, elementId);
        if (!element) return store;

        if (!isValidMoveTarget(store.root, element, elementId, newParentId)) {
          return store;
        }

        sealSession();
        saveHistory(store);

        const removeResult = removeElementFromContainer(store.root, elementId);
        if (!removeResult.removed) return store;

        store.root = removeResult.container;

        const movedElement = repositionMovedElement(structuredClone(element), newParentId);
        if (!newParentId || newParentId === 'root') {
          store.root = {
            ...store.root,
            children: insertAtIndex(store.root.children, movedElement, insertIndex)
          };
        } else {
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

        sealSession();
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

  if (hasChildren(element)) {
    for (const child of element.children) {
      const found = findElementById(child, targetId);
      if (found) return found;
    }
  }

  return null;
}

// Helper function to insert element at specific index (or end if undefined)
function insertAtIndex(
  children: TemplateElement[] | undefined,
  element: TemplateElement,
  index?: number
): TemplateElement[] {
  const arr = children ?? [];
  if (index === undefined || index < 0 || index >= arr.length) {
    return [...arr, element];
  }
  return [...arr.slice(0, index), element, ...arr.slice(index)];
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
    if (hasChildren(child)) {
      const found = findElementById(child, parentId);
      if (found) {
        return addElementToChildContainer(child, parentId, element, insertIndex);
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

// Helper to add element to a child that has children (container, iterator, or shape)
function addElementToChildContainer(
  parent: ParentElement,
  parentId: string,
  element: TemplateElement,
  insertIndex?: number
): ParentElement {
  if (parent.id === parentId) {
    return {
      ...parent,
      children: insertAtIndex(parent.children, element, insertIndex)
    };
  }

  const newChildren = (parent.children ?? []).map((child: TemplateElement) => {
    if (hasChildren(child)) {
      const found = findElementById(child, parentId);
      if (found) {
        return addElementToChildContainer(child, parentId, element, insertIndex);
      }
    }
    return child;
  });

  return { ...parent, children: newChildren };
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

  // Recursively search in nested containers and iterators
  let removed = false;
  const newChildren = container.children.map((child: TemplateElement) => {
    if (!removed && hasChildren(child)) {
      const found = findElementById(child, targetId);
      if (found) {
        const result = removeElementFromChildContainer(child, targetId);
        removed = result.removed;
        return result.element;
      }
    }
    return child;
  });

  return {
    container: removed ? { ...container, children: newChildren } : container,
    removed
  };
}

// Helper to remove element from a child that has children (container, iterator, or shape)
function removeElementFromChildContainer(
  parent: ParentElement,
  targetId: string
): { element: ParentElement; removed: boolean } {
  const children = parent.children ?? [];
  const hasChild = children.some((child: TemplateElement) => child.id === targetId);
  if (hasChild) {
    return {
      element: {
        ...parent,
        children: children.filter((child: TemplateElement) => child.id !== targetId)
      },
      removed: true
    };
  }

  let removed = false;
  const newChildren = children.map((child: TemplateElement) => {
    if (!removed && hasChildren(child)) {
      const found = findElementById(child, targetId);
      if (found) {
        const result = removeElementFromChildContainer(child, targetId);
        removed = result.removed;
        return result.element;
      }
    }
    return child;
  });

  return {
    element: removed ? { ...parent, children: newChildren } : parent,
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
    if (hasChildren(child)) {
      const found = findElementById(child, targetId);
      if (found) {
        return updateElementInChildContainer(child, targetId, updates);
      }
    }
    return child;
  });

  return {
    ...container,
    children: newChildren
  };
}

// Helper to update element in a child that has children (container, iterator, or shape)
function updateElementInChildContainer(
  parent: ParentElement,
  targetId: string,
  updates: Partial<TemplateElement>
): ParentElement {
  if (parent.id === targetId) {
    return { ...parent, ...updates } as ContainerElement | IteratorElement;
  }

  const newChildren = (parent.children ?? []).map((child: TemplateElement): TemplateElement => {
    if (child.id === targetId) {
      return { ...child, ...updates } as TemplateElement;
    }
    if (hasChildren(child)) {
      const found = findElementById(child, targetId);
      if (found) {
        return updateElementInChildContainer(child, targetId, updates);
      }
    }
    return child;
  });

  return { ...parent, children: newChildren };
}

// Helper function to find parent and index of an element
function findParentAndIndex(
  container: ParentElement,
  targetId: string,
  parentId: string = 'root'
): { parentId: string; index: number } | null {
  const children = container.children ?? [];
  // Check if target is in direct children
  const index = children.findIndex((child: TemplateElement) => child.id === targetId);
  if (index !== -1) {
    return { parentId, index };
  }

  // Recursively search in nested containers and iterators
  for (const child of children) {
    if (hasChildren(child)) {
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
  if (hasChildren(duplicated)) {
    duplicated.children = duplicated.children.map((child: TemplateElement) =>
      duplicateElementWithNewIds(child)
    );
  }

  return duplicated;
}

export const templateStore = createTemplateStore();

/** Collect all descendant element IDs of a given element. */
function collectDescendantIds(element: TemplateElement): Set<string> {
  const ids = new Set<string>();
  if (hasChildren(element)) {
    for (const child of element.children) {
      ids.add(child.id);
      for (const id of collectDescendantIds(child)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

/**
 * Derived store: set of element IDs that should be visually highlighted
 * (without handles) because a parent iterator is selected.
 */
export const highlightedElementIds = derived(templateStore, ($store) => {
  if (!$store.selectedElementId) return new Set<string>();
  const selected = findElementById($store.root, $store.selectedElementId);
  if (selected?.type !== 'iterator') return new Set<string>();
  return collectDescendantIds(selected);
});

/** ID of the text element currently being inline-edited, or null. */
export const editingElementId = writable<string | null>(null);
