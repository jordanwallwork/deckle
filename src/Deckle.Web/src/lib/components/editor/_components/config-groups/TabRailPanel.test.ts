// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import TabRailPanel from './TabRailPanel.svelte';
import { panelPrefs } from './panelPrefs.svelte';
import type { ContainerElement } from '../../types';

function container(overrides: Partial<ContainerElement> = {}): ContainerElement {
  return { id: 'c1', type: 'container', children: [], ...overrides };
}

const baseProps = () => ({ dpi: 96, update: vi.fn(), seal: vi.fn() });

describe('TabRailPanel (variant B)', () => {
  beforeEach(() => {
    // Default to a tab whose content avoids ColorPicker (onMount) in jsdom.
    panelPrefs.activeTab = 'size';
  });

  it('renders a tab for every granted non-identity group', () => {
    const { getByLabelText } = render(TabRailPanel, {
      props: { elements: [container()], ...baseProps() }
    });
    for (const label of ['Position', 'Size', 'Layout', 'Background', 'Border', 'Effects']) {
      expect(getByLabelText(label)).toBeTruthy();
    }
  });

  it('marks tabs whose group has set values with a set dot', () => {
    const { getByLabelText } = render(TabRailPanel, {
      props: { elements: [container({ opacity: 0.5 })], ...baseProps() }
    });
    const effectsTab = getByLabelText('Effects');
    expect(effectsTab.querySelector('.set-dot')).toBeTruthy();
    const positionTab = getByLabelText('Position');
    expect(positionTab.querySelector('.set-dot')).toBeNull();
  });

  it('renders the remembered active tab content', () => {
    panelPrefs.activeTab = 'size';
    const { getByText, container: dom } = render(TabRailPanel, {
      props: { elements: [container()], ...baseProps() }
    });
    // Active tab title + the Size group's width control are shown.
    expect(getByText('Size')).toBeTruthy();
    expect(dom.querySelector('#size-width')).toBeTruthy();
  });

  it('falls back to the first granted group when the remembered tab is not granted', () => {
    // typography is only granted to text; a container should fall back.
    panelPrefs.activeTab = 'typography';
    const { getByText } = render(TabRailPanel, {
      props: { elements: [container()], ...baseProps() }
    });
    // First non-identity group for a container is Position.
    expect(getByText('Position')).toBeTruthy();
  });
});
