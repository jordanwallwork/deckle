import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { templateStore } from './templateElements';
import type { ContainerElement, TextElement } from '$lib/components/editor/types';

function makeText(id: string, content = 'hello'): TextElement {
  return { id, type: 'text', content };
}

function selectedText(): TextElement {
  const store = get(templateStore);
  const el = store.root.children.find((c) => c.id === 'text-1');
  return el as TextElement;
}

describe('templateStore edit-sessions (D7)', () => {
  beforeEach(() => {
    templateStore.reset();
    templateStore.addElement(makeText('text-1'), 'root');
  });

  it('creates one history entry per un-keyed update', () => {
    templateStore.updateElement('text-1', { content: 'a' });
    templateStore.updateElement('text-1', { content: 'ab' });
    templateStore.updateElement('text-1', { content: 'abc' });

    expect(selectedText().content).toBe('abc');

    templateStore.undo();
    expect(selectedText().content).toBe('ab');
    templateStore.undo();
    expect(selectedText().content).toBe('a');
  });

  it('collapses consecutive same-key updates into one history entry', () => {
    // establish a committed baseline
    templateStore.updateElement('text-1', { content: 'start' });

    const key = 'text-1:content';
    templateStore.updateElement('text-1', { content: 's' }, key);
    templateStore.updateElement('text-1', { content: 'se' }, key);
    templateStore.updateElement('text-1', { content: 'set' }, key);

    // live root reflects the latest value (no commit-on-blur)
    expect(selectedText().content).toBe('set');

    // a single undo returns to the pre-session baseline, not the last keystroke
    templateStore.undo();
    expect(selectedText().content).toBe('start');
  });

  it('starts a new history entry when the session key changes', () => {
    templateStore.updateElement('text-1', { content: 'x' }, 'text-1:content');
    templateStore.updateElement('text-1', { label: 'Label A' }, 'text-1:label');

    templateStore.undo();
    // undoing the label edit leaves the content edit intact
    expect(selectedText().label).toBeUndefined();
    expect(selectedText().content).toBe('x');
  });

  it('seals a session so the next same-key update is a separate entry', () => {
    templateStore.updateElement('text-1', { content: 'a' }, 'text-1:content');
    templateStore.updateElement('text-1', { content: 'ab' }, 'text-1:content');
    templateStore.sealSession();
    templateStore.updateElement('text-1', { content: 'abc' }, 'text-1:content');

    templateStore.undo();
    expect(selectedText().content).toBe('ab');
    templateStore.undo();
    expect(selectedText().content).toBe('hello');
  });

  it('seals the session on selection change', () => {
    templateStore.updateElement('text-1', { content: 'a' }, 'text-1:content');
    templateStore.selectElement(null);
    templateStore.updateElement('text-1', { content: 'ab' }, 'text-1:content');

    templateStore.undo();
    expect(selectedText().content).toBe('a');
  });

  it('restores selection alongside content on undo/redo', () => {
    templateStore.selectElement('text-1');
    templateStore.updateElement('text-1', { content: 'changed' });

    templateStore.selectElement(null);
    templateStore.undo();
    expect(get(templateStore).selectedElementId).toBe('text-1');
  });
});

describe('templateStore structural operations', () => {
  beforeEach(() => {
    templateStore.reset();
  });

  it('duplicateElement inserts a copy with a new id after the original', () => {
    templateStore.addElement(makeText('text-1', 'original'), 'root');
    templateStore.duplicateElement('text-1');

    const root = get(templateStore).root as ContainerElement;
    expect(root.children).toHaveLength(2);
    expect(root.children[0].id).toBe('text-1');
    expect(root.children[1].id).not.toBe('text-1');
    expect((root.children[1] as TextElement).content).toBe('original');
  });

  it('moveElement into a container repositions from absolute to relative', () => {
    const container: ContainerElement = {
      id: 'box',
      type: 'container',
      children: []
    };
    templateStore.addElement(container, 'root');
    templateStore.addElement(makeText('text-1'), 'root');
    // root-level element is forced absolute
    expect(
      (get(templateStore).root.children.find((c) => c.id === 'text-1') as TextElement).position
    ).toBe('absolute');

    templateStore.moveElement('text-1', 'box');

    const box = get(templateStore).root.children.find((c) => c.id === 'box') as ContainerElement;
    expect(box.children).toHaveLength(1);
    expect(box.children[0].position).toBe('relative');
    expect(box.children[0].x).toBeUndefined();
  });
});
