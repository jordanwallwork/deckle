import { describe, it, expect } from 'vitest';
import {
  ELEMENT_GROUPS,
  GROUP_META,
  groupsForType,
  typeHasGroup,
  type PropertyGroup
} from './capabilities';
import type { ElementType } from './types';

const ALL_TYPES: ElementType[] = ['container', 'text', 'image', 'iterator', 'shape', 'grid'];
const ALL_GROUPS: PropertyGroup[] = [
  'identity',
  'position',
  'size',
  'layout',
  'typography',
  'background',
  'border',
  'effects'
];

describe('ELEMENT_GROUPS matrix', () => {
  it('grants every visual type the shared groups (no typography except text)', () => {
    const visual: ElementType[] = ['container', 'image', 'shape', 'grid'];
    for (const t of visual) {
      expect(ELEMENT_GROUPS[t]).toEqual([
        'identity',
        'position',
        'size',
        'layout',
        'background',
        'border',
        'effects'
      ]);
    }
  });

  it('grants text typography in addition to the shared groups', () => {
    expect(ELEMENT_GROUPS.text).toContain('typography');
    expect(ELEMENT_GROUPS.text).toEqual([
      'identity',
      'position',
      'size',
      'layout',
      'typography',
      'background',
      'border',
      'effects'
    ]);
  });

  it('grants iterator ONLY identity (logical element, ADR-0001 D2)', () => {
    expect(ELEMENT_GROUPS.iterator).toEqual(['identity']);
    expect(typeHasGroup('iterator', 'background')).toBe(false);
    expect(typeHasGroup('iterator', 'position')).toBe(false);
    expect(typeHasGroup('iterator', 'effects')).toBe(false);
  });

  it('every type starts with identity', () => {
    for (const t of ALL_TYPES) {
      expect(ELEMENT_GROUPS[t][0]).toBe('identity');
    }
  });

  it('only text has typography', () => {
    for (const t of ALL_TYPES) {
      expect(typeHasGroup(t, 'typography')).toBe(t === 'text');
    }
  });
});

describe('groupsForType / typeHasGroup', () => {
  it('groupsForType returns the matrix row', () => {
    expect(groupsForType('shape')).toBe(ELEMENT_GROUPS.shape);
  });

  it('typeHasGroup agrees with the matrix', () => {
    for (const t of ALL_TYPES) {
      for (const g of ALL_GROUPS) {
        expect(typeHasGroup(t, g)).toBe(ELEMENT_GROUPS[t].includes(g));
      }
    }
  });
});

describe('GROUP_META', () => {
  it('has metadata for every group', () => {
    for (const g of ALL_GROUPS) {
      expect(GROUP_META[g]).toBeDefined();
      expect(GROUP_META[g].label.length).toBeGreaterThan(0);
      expect(GROUP_META[g].glyph.length).toBeGreaterThan(0);
    }
  });
});
