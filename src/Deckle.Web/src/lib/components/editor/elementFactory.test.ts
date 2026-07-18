import { describe, it, expect } from 'vitest';
import { createElementOfType } from './elementFactory';
import type { ContainerElement, TextElement, ImageElement, IteratorElement, ShapeElement, GridElement } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createElementOfType', () => {
  // --------------------------------------------------------------------------
  // Common properties
  // --------------------------------------------------------------------------

  it.each(['container', 'text', 'image', 'iterator', 'shape'] as const)(
    '%s element has a valid UUID id',
    (type) => {
      const el = createElementOfType(type);
      expect(el.id).toMatch(UUID_RE);
    }
  );

  it.each(['container', 'text', 'image', 'iterator', 'shape'] as const)(
    '%s element generates a unique id on each call',
    (type) => {
      const a = createElementOfType(type);
      const b = createElementOfType(type);
      expect(a.id).not.toBe(b.id);
    }
  );

  // Unset-first (ADR-0001 D4): cosmetic styling defaults are NOT stamped —
  // their effective values live in effectiveDefaults.ts and are resolved by
  // the renderers, so an omitted property renders identically.
  it.each(['container', 'text', 'image', 'iterator', 'shape'] as const)(
    '%s element leaves visibilityMode unset',
    (type) => {
      expect(createElementOfType(type).visibilityMode).toBeUndefined();
    }
  );

  it.each(['container', 'text', 'image', 'iterator', 'shape'] as const)(
    '%s element leaves opacity unset',
    (type) => {
      expect(createElementOfType(type).opacity).toBeUndefined();
    }
  );

  // --------------------------------------------------------------------------
  // Container
  // --------------------------------------------------------------------------

  describe('container', () => {
    it('has type "container"', () => {
      expect(createElementOfType('container').type).toBe('container');
    });

    it('leaves display unset (effective default "flex")', () => {
      const el = createElementOfType('container') as ContainerElement;
      expect(el.display).toBeUndefined();
    });

    it('leaves flexConfig unset (resolved by the renderer)', () => {
      const el = createElementOfType('container') as ContainerElement;
      expect(el.flexConfig).toBeUndefined();
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

    it('leaves fontSize unset (effective default 16)', () => {
      const el = createElementOfType('text') as TextElement;
      expect(el.fontSize).toBeUndefined();
    });

    it('leaves color unset (effective default "#000000")', () => {
      const el = createElementOfType('text') as TextElement;
      expect(el.color).toBeUndefined();
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

  // --------------------------------------------------------------------------
  // Shape
  // --------------------------------------------------------------------------

  describe('shape', () => {
    it('has type "shape"', () => {
      expect(createElementOfType('shape').type).toBe('shape');
    });

    it('has default shapeType "circle"', () => {
      const el = createElementOfType('shape') as ShapeElement;
      expect(el.shapeType).toBe('circle');
    });

    it('has default dimensions of 100×100 px', () => {
      const el = createElementOfType('shape') as ShapeElement;
      expect(el.dimensions).toEqual({ width: 100, height: 100 });
    });

    it('starts with an empty children array', () => {
      const el = createElementOfType('shape') as ShapeElement;
      expect(el.children).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Grid
  // --------------------------------------------------------------------------

  describe('grid', () => {
    it('keeps structural/data/size fields', () => {
      const el = createElementOfType('grid') as GridElement;
      expect(el.type).toBe('grid');
      expect(el.variant).toBe('checkerboard');
      expect(el.itemSize).toBe(20);
      expect(el.cells).toEqual([]);
      expect(el.children).toEqual([]);
      expect(el.dimensions).toEqual({ width: 100, height: 100 });
    });

    it('leaves cell styling unset (resolved by the renderer)', () => {
      const el = createElementOfType('grid') as GridElement;
      expect(el.cellBackground).toBeUndefined();
      expect(el.cellBorder).toBeUndefined();
    });
  });
});
