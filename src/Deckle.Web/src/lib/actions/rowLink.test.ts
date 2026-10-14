// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

import { isInteractiveClick, rowLink } from './rowLink';

function buildRow() {
  const row = document.createElement('div');
  row.innerHTML = `
    <span class="plain">Plain <em>text</em></span>
    <a href="/elsewhere"><strong>Link</strong></a>
    <button type="button">Action</button>
  `;
  document.body.appendChild(row);
  return row;
}

describe('isInteractiveClick', () => {
  it('is false for plain content', () => {
    const row = buildRow();
    expect(isInteractiveClick(row.querySelector('em'), row)).toBe(false);
  });

  it('is true for a link, its descendants, and buttons', () => {
    const row = buildRow();
    expect(isInteractiveClick(row.querySelector('a'), row)).toBe(true);
    expect(isInteractiveClick(row.querySelector('strong'), row)).toBe(true);
    expect(isInteractiveClick(row.querySelector('button'), row)).toBe(true);
  });

  it('ignores interactive ancestors outside the container', () => {
    const outer = document.createElement('a');
    const row = document.createElement('div');
    const cell = document.createElement('span');
    row.appendChild(cell);
    outer.appendChild(row);
    expect(isInteractiveClick(cell, row)).toBe(false);
  });

  it('is false for non-element targets', () => {
    const row = buildRow();
    expect(isInteractiveClick(null, row)).toBe(false);
    expect(isInteractiveClick(document.createTextNode('x'), row)).toBe(false);
  });
});

describe('rowLink', () => {
  beforeEach(() => goto.mockReset());

  it('navigates on a plain click and marks the row', () => {
    const row = buildRow();
    rowLink(row, '/target');
    expect(row.classList.contains('row-link')).toBe(true);

    row.querySelector<HTMLElement>('.plain')!.click();
    expect(goto).toHaveBeenCalledWith('/target');
  });

  it('leaves clicks on inner links and buttons alone', () => {
    const row = buildRow();
    rowLink(row, '/target');

    row.querySelector('a')!.addEventListener('click', (e) => e.preventDefault());
    row.querySelector<HTMLElement>('strong')!.click();
    row.querySelector('button')!.click();

    expect(goto).not.toHaveBeenCalled();
  });

  it('uses the updated href and stops after destroy', () => {
    const row = buildRow();
    const handle = rowLink(row, '/first');
    handle?.update?.('/second');

    row.click();
    expect(goto).toHaveBeenLastCalledWith('/second');

    handle?.destroy?.();
    row.click();
    expect(goto).toHaveBeenCalledTimes(1);
    expect(row.classList.contains('row-link')).toBe(false);
  });
});
