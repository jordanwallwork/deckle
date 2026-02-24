import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    componentsApi: { listByProject: vi.fn(), getById: vi.fn() },
    dataSourcesApi: { getById: vi.fn(), getData: vi.fn() }
  };
});

import { componentsApi, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeCard = (id: string, overrides = {}) => ({
  id,
  type: 'Card',
  name: `Card ${id}`,
  dimensions: { widthMm: 63.5, heightMm: 88.9 },
  dataSource: null,
  ...overrides
});

const makeEvent = (searchParams: Record<string, string> = {}) => {
  const url = new URL('http://localhost/export');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return {
    url,
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  } as any;
};

describe('export page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all exportable components and empty selected list when no query param', async () => {
    const allComponents = [makeCard('c1'), makeCard('c2'), { id: 'd1', type: 'Dice' }];
    vi.mocked(componentsApi.listByProject).mockResolvedValue(allComponents as any);

    const result = await load(makeEvent());

    expect(result.allExportableComponents).toHaveLength(2);
    expect(result.components).toHaveLength(0);
    expect(result.project).toEqual(project);
  });

  it('returns empty components list for empty components param', async () => {
    vi.mocked(componentsApi.listByProject).mockResolvedValue([makeCard('c1')] as any);

    const result = await load(makeEvent({ components: '' }));

    expect(result.components).toHaveLength(0);
  });

  it('loads the selected component when a component ID is provided', async () => {
    const card = makeCard('c1');
    vi.mocked(componentsApi.listByProject).mockResolvedValue([card] as any);
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);

    const result = await load(makeEvent({ components: 'c1' }));

    expect(result.components).toHaveLength(1);
    expect(result.components[0].component).toEqual(card);
    expect(result.components[0].dataSource).toBeNull();
    expect(result.components[0].dataSourceRows).toEqual([]);
  });

  it('loads data source rows when the component has a linked data source', async () => {
    const card = makeCard('c1', { dataSource: { id: 'ds1' } });
    const fullDataSource = { id: 'ds1', name: 'My Sheet' };
    const dataResult = { data: [['Name', 'Value'], ['Alice', '10']] };
    vi.mocked(componentsApi.listByProject).mockResolvedValue([card] as any);
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);
    vi.mocked(dataSourcesApi.getById).mockResolvedValue(fullDataSource as any);
    vi.mocked(dataSourcesApi.getData).mockResolvedValue(dataResult as any);

    const result = await load(makeEvent({ components: 'c1' }));

    expect(result.components[0].dataSource).toEqual(fullDataSource);
    expect(result.components[0].dataSourceRows.length).toBeGreaterThan(0);
  });

  it('continues without data source if loading it fails', async () => {
    const card = makeCard('c1', { dataSource: { id: 'ds1' } });
    vi.mocked(componentsApi.listByProject).mockResolvedValue([card] as any);
    vi.mocked(componentsApi.getById).mockResolvedValue(card as any);
    vi.mocked(dataSourcesApi.getById).mockRejectedValue(new Error('Failed'));

    const result = await load(makeEvent({ components: 'c1' }));

    expect(result.components[0].dataSource).toBeNull();
    expect(result.components[0].dataSourceRows).toEqual([]);
  });

  it('loads multiple components when comma-separated IDs are provided', async () => {
    const card1 = makeCard('c1');
    const card2 = makeCard('c2');
    vi.mocked(componentsApi.listByProject).mockResolvedValue([card1, card2] as any);
    vi.mocked(componentsApi.getById)
      .mockResolvedValueOnce(card1 as any)
      .mockResolvedValueOnce(card2 as any);

    const result = await load(makeEvent({ components: 'c1,c2' }));

    expect(result.components).toHaveLength(2);
  });

  it('throws a 500 error when listByProject fails unexpectedly', async () => {
    vi.mocked(componentsApi.listByProject).mockRejectedValue(new Error('Network error'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });

  it('only includes Card and PlayerMat in exportable components', async () => {
    const allComponents = [
      makeCard('c1'),
      { id: 'pm1', type: 'PlayerMat', dimensions: {} },
      { id: 'd1', type: 'Dice' }
    ];
    vi.mocked(componentsApi.listByProject).mockResolvedValue(allComponents as any);

    const result = await load(makeEvent());

    expect(result.allExportableComponents.map((c: any) => c.id)).toEqual(['c1', 'pm1']);
  });
});
