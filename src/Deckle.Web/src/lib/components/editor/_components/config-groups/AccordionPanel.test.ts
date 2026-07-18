// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import AccordionPanel from './AccordionPanel.svelte';
import { panelPrefs } from './panelPrefs.svelte';
import type { ContainerElement } from '../../types';

function container(overrides: Partial<ContainerElement> = {}): ContainerElement {
  return { id: 'c1', type: 'container', children: [], ...overrides };
}

const baseProps = () => ({ dpi: 96, update: vi.fn(), seal: vi.fn() });

describe('AccordionPanel (variant A)', () => {
  beforeEach(() => {
    // Only position/size/layout open by default — keeps ColorPicker (onMount)
    // collapsed and avoids unrelated library init in jsdom.
    panelPrefs.openGroups = new Set(['position', 'size', 'layout']);
  });

  it('renders a header for every granted non-identity group', () => {
    const { getByText } = render(AccordionPanel, {
      props: { elements: [container()], ...baseProps() }
    });
    for (const label of ['Position', 'Size', 'Layout', 'Background', 'Border', 'Effects']) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('pins the identity fields (label input) at the top', () => {
    const { container: dom } = render(AccordionPanel, {
      props: { elements: [container()], ...baseProps() }
    });
    expect(dom.querySelector('#label')).toBeTruthy();
  });

  it('surfaces a set-indicator summary when a group has set values', () => {
    // opacity 0.5 → Effects group summarised as "50%".
    const { getByText } = render(AccordionPanel, {
      props: { elements: [container({ opacity: 0.5 })], ...baseProps() }
    });
    expect(getByText('50%')).toBeTruthy();
  });

  it('remembers open groups across selections (open body renders its control)', () => {
    panelPrefs.openGroups = new Set(['size']);
    const { container: dom } = render(AccordionPanel, {
      props: { elements: [container()], ...baseProps() }
    });
    // Size group body renders the width dimension input when open.
    expect(dom.querySelector('#size-width')).toBeTruthy();
    // Position is closed → its control is absent.
    expect(dom.querySelector('#pos-z')).toBeNull();
  });
});
