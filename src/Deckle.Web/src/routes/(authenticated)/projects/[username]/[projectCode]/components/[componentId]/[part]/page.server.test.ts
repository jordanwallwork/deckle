import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    componentsApi: { getById: vi.fn() },
    dataSourcesApi: { getById: vi.fn(), getAll: vi.fn() }
  };
});

import { componentsApi, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeCard = (overrides = {}) => ({
  id: 'c1',
  type: 'Card',
  name: 'Test Card',
  dimensions: { widthMm: 63.5, heightMm: 88.9 },
  dataSource: null,
  ...overrides
});

const makeEvent = (componentId = 'c1', part = 'front') =>
  ({
    params: { componentId, part },
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  }) as any;

describe('component editor page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);
  });

  it('returns component and part when component has dimensions', async () => {
    const card = makeCard();
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);

    const result = await load(makeEvent());

    expect(result).toMatchObject({ component: card, part: 'front', dataSource: null });
  });

  it('includes dataSources from the project', async () => {
    const card = makeCard();
    const dataSources = [{ id: 'ds1', name: 'Sheet' }];
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue(dataSources as any);

    const result = await load(makeEvent());

    expect(result.dataSources).toEqual(dataSources);
  });

  it('loads data source details when component has a linked data source', async () => {
    const dataSourceRef = { id: 'ds1' };
    const card = makeCard({ dataSource: dataSourceRef });
    const fullDataSource = { id: 'ds1', name: 'My Sheet' };
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);
    vi.mocked(dataSourcesApi.getById).mockResolvedValue(fullDataSource as any);

    const result = await load(makeEvent());

    expect(result.dataSource).toEqual(fullDataSource);
  });

  it('continues without data source if loading it fails', async () => {
    const card = makeCard({ dataSource: { id: 'ds1' } });
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);
    vi.mocked(dataSourcesApi.getById).mockRejectedValue(new Error('Not found'));

    const result = await load(makeEvent());

    expect(result.dataSource).toBeNull();
  });

  it('continues without dataSources list if loading it fails', async () => {
    const card = makeCard();
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);
    vi.mocked(dataSourcesApi.getAll).mockRejectedValue(new Error('Failed'));

    const result = await load(makeEvent());

    expect(result.dataSources).toEqual([]);
  });

  it('throws 404 when the component has no dimensions (inner error caught by outer try/catch)', async () => {
    const dice = { id: 'c1', type: 'Dice', name: 'Test Dice' };
    vi.mocked(componentsApi.getById).mockResolvedValue(dice as any);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 when component fetch fails', async () => {
    vi.mocked(componentsApi.getById).mockRejectedValue(new Error('Not found'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
  });

  it('includes the project in the returned data', async () => {
    const card = makeCard();
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);

    const result = await load(makeEvent());

    expect(result.project).toEqual(project);
  });
});
