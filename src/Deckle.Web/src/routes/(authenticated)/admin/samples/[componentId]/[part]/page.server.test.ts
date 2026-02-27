import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    adminApi: { getSample: vi.fn() }
  };
});

import { adminApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();

const makeCard = (overrides = {}) => ({
  id: 'c1',
  type: 'Card',
  name: 'Sample Card',
  dimensions: { widthMm: 63.5, heightMm: 88.9 },
  ...overrides
});

const makeEvent = (componentId = 'c1', part = 'front') =>
  ({
    params: { componentId, part },
    fetch: mockFetch
  }) as any;

describe('admin sample editor page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the component and part for a valid front request', async () => {
    const card = makeCard();
    vi.mocked(adminApi.getSample).mockResolvedValue(card as any);

    const result = await load(makeEvent('c1', 'front'));

    expect(result!.component).toEqual(card);
    expect(result!.part).toBe('front');
  });

  it('returns the component and part for a valid back request', async () => {
    const card = makeCard();
    vi.mocked(adminApi.getSample).mockResolvedValue(card as any);

    const result = await load(makeEvent('c1', 'back'));

    expect(result!.part).toBe('back');
  });

  it('throws 404 when the component has no dimensions (inner error caught by outer try/catch)', async () => {
    const dice = { id: 'c1', type: 'Dice', name: 'Sample Dice' };
    vi.mocked(adminApi.getSample).mockResolvedValue(dice as any);

    await expect(load(makeEvent('c1', 'front'))).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 for an invalid part value (inner error caught by outer try/catch)', async () => {
    const card = makeCard();
    vi.mocked(adminApi.getSample).mockResolvedValue(card as any);

    await expect(load(makeEvent('c1', 'invalid'))).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 when the component cannot be loaded', async () => {
    vi.mocked(adminApi.getSample).mockRejectedValue(new Error('Not found'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
  });
});
