import { describe, it, expect } from 'vitest';
import { createElementOfType } from './elementFactory';
import type { ContainerElement, TextElement, ImageElement, IteratorElement } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createElementOfType', () => {
  // --------------------------------------------------------------------------
  // Common properties
  // --------------------------------------------------------------------------

  it.each(['container', 'text', 'image', 'iterator'] as const)(
    '%s element has a valid UUID id',
    (type) => {
      const el = createElementOfType(type);
      expect(el.id).toMatch(UUID_RE);
    }
  );

  it.each(['container', 'text', 'image', 'iterator'] as const)(
    '%s element generates a unique id on each call',
    (type) => {
      const a = createElementOfType(type);
      const b = createElementOfType(type);
      expect(a.id).not.toBe(b.id);
    }
  );

  it.each(['container', 'text', 'image', 'iterator'] as const)(
    '%s element has visibilityMode "show"',
    (type) => {
      expect(createElementOfType(type).visibilityMode).toBe('show');
    }
  );

  it.each(['container', 'text', 'image', 'iterator'] as const)(
    '%s element has opacity 1',
    (type) => {
      expect(createElementOfType(type).opacity).toBe(1);
    }
  );

  // --------------------------------------------------------------------------
  // Container
  // --------------------------------------------------------------------------

  describe('container', () => {
    it('has type "container"', () => {
      expect(createElementOfType('container').type).toBe('container');
    });

    it('has display "flex"', () => {
      const el = createElementOfType('container') as ContainerElement;
      expect(el.display).toBe('flex');
    });

    it('has sensible flex defaults', () => {
      const el = createElementOfType('container') as ContainerElement;
      expect(el.flexConfig).toEqual({
        direction: 'column',
        wrap: 'nowrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
      });
    });

    it('starts with an empty children array', () => {
      const el = createElementOfType('container') as ContainerElement;
      expect(el.children).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Text
  // --------------------------------------------------------------------------

  describe('text', () => {
    it('has type "text"', () => {
      expect(createElementOfType('text').type).toBe('text');
    });

    it('has default content "New Text"', () => {
      const el = createElementOfType('text') as TextElement;
      expect(el.content).toBe('New Text');
    });

    it('has default fontSize 16', () => {
      const el = createElementOfType('text') as TextElement;
      expect(el.fontSize).toBe(16);
    });

    it('has default color "#000000"', () => {
      const el = createElementOfType('text') as TextElement;
      expect(el.color).toBe('#000000');
    });
  });

  // --------------------------------------------------------------------------
  // Image
  // --------------------------------------------------------------------------

  describe('image', () => {
    it('has type "image"', () => {
      expect(createElementOfType('image').type).toBe('image');
    });

    it('has an empty imageId', () => {
      const el = createElementOfType('image') as ImageElement;
      expect(el.imageId).toBe('');
    });

    it('has default dimensions of 100×100 px', () => {
      const el = createElementOfType('image') as ImageElement;
      expect(el.dimensions).toEqual({ width: 100, height: 100 });
    });
  });

  // --------------------------------------------------------------------------
  // Iterator
  // --------------------------------------------------------------------------

  describe('iterator', () => {
    it('has type "iterator"', () => {
      expect(createElementOfType('iterator').type).toBe('iterator');
    });

    it('has default iteratorName "i"', () => {
      const el = createElementOfType('iterator') as IteratorElement;
      expect(el.iteratorName).toBe('i');
    });

    it('has default fromExpression "1"', () => {
      const el = createElementOfType('iterator') as IteratorElement;
      expect(el.fromExpression).toBe('1');
    });

    it('has default toExpression "3"', () => {
      const el = createElementOfType('iterator') as IteratorElement;
      expect(el.toExpression).toBe('3');
    });

    it('starts with an empty children array', () => {
      const el = createElementOfType('iterator') as IteratorElement;
      expect(el.children).toEqual([]);
    });
  });
});
