import { describe, it, expect } from 'vitest';
import type { CardComponent, PlayerMatComponent, EditableComponent } from '$lib/types';
import {
  buildProjectBreadcrumbs,
  buildComponentsBreadcrumbs,
  buildSettingsBreadcrumbs,
  buildEditorBreadcrumbs,
  buildComponentExportBreadcrumbs,
  buildDataSourcesBreadcrumbs,
  buildDataSourceBreadcrumbs,
  buildDataSourceEditBreadcrumbs,
  buildAdminBreadcrumbs,
  buildAdminSamplesBreadcrumbs,
  buildAdminSampleEditorBreadcrumbs,
  buildAdminUsersBreadcrumbs,
  buildAdminDataSourcesBreadcrumbs,
  buildAdminDataSourceEditorBreadcrumbs
} from './breadcrumbs';

const project = {
  id: 'p1',
  name: 'My Project',
  ownerUsername: 'alice',
  code: 'my-project'
};

const projectUrl = '/projects/alice/my-project';

const mockCard: CardComponent = {
  id: 'c1',
  projectId: 'p1',
  name: 'Hero Card',
  type: 'Card',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  size: 'StandardPoker',
  horizontal: false,
  dimensions: {
    widthMm: 63.5,
    heightMm: 88.9,
    bleedMm: 3,
    dpi: 300,
    widthPx: 749,
    heightPx: 1050,
    bleedPx: 35
  },
  shape: { type: 'rectangle' }
};

const mockPlayerMat: PlayerMatComponent = {
  id: 'pm1',
  projectId: 'p1',
  name: 'Player Board',
  type: 'PlayerMat',
  horizontal: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  dimensions: {
    widthMm: 210,
    heightMm: 297,
    bleedMm: 3,
    dpi: 300,
    widthPx: 2480,
    heightPx: 3508,
    bleedPx: 35
  },
  shape: { type: 'rectangle' }
};

describe('buildProjectBreadcrumbs', () => {
  it('returns two breadcrumbs', () => {
    expect(buildProjectBreadcrumbs(project)).toHaveLength(2);
  });

  it('starts with a Projects link', () => {
    const [first] = buildProjectBreadcrumbs(project);
    expect(first.label).toBe('Projects');
    expect(first.href).toBe('/projects');
  });

  it('ends with the project name and correct URL', () => {
    const crumbs = buildProjectBreadcrumbs(project);
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('My Project');
    expect(last.href).toBe(projectUrl);
    expect(last.isActive).toBe(true);
  });
});

describe('buildComponentsBreadcrumbs', () => {
  it('returns three breadcrumbs', () => {
    expect(buildComponentsBreadcrumbs(project)).toHaveLength(3);
  });

  it('ends with a Components breadcrumb pointing to the components list', () => {
    const crumbs = buildComponentsBreadcrumbs(project);
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Components');
    expect(last.href).toBe(`${projectUrl}/components`);
    expect(last.isActive).toBe(true);
  });

  it('sets preceding breadcrumbs to inactive', () => {
    const [projects, projectName] = buildComponentsBreadcrumbs(project);
    expect(projects.isActive).toBe(false);
    expect(projectName.isActive).toBe(false);
  });
});

describe('buildSettingsBreadcrumbs', () => {
  it('ends with a Settings breadcrumb', () => {
    const crumbs = buildSettingsBreadcrumbs(project);
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Settings');
    expect(last.href).toBe(`${projectUrl}/settings`);
    expect(last.isActive).toBe(true);
  });
});

describe('buildEditorBreadcrumbs', () => {
  describe('without a part', () => {
    it('appends the component name as the active item', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockCard);
      const last = crumbs[crumbs.length - 1];
      expect(last.label).toBe('Hero Card');
      expect(last.href).toBe(`${projectUrl}/components/c1/front`);
      expect(last.isActive).toBe(true);
    });

    it('does not add a part item', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockCard);
      // components breadcrumbs (3) + component name (1) = 4
      expect(crumbs).toHaveLength(4);
    });
  });

  describe('with a part', () => {
    it('appends the component name and then the part as the active item', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockCard, 'Front');
      // components breadcrumbs (3) + component name (1) + part (1) = 5
      expect(crumbs).toHaveLength(5);
      const last = crumbs[crumbs.length - 1];
      expect(last.label).toBe('Front');
      expect(last.isActive).toBe(true);
    });

    it('lowercases the part name in the href', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockCard, 'Back');
      const last = crumbs[crumbs.length - 1];
      expect(last.href).toBe(`${projectUrl}/components/c1/back`);
    });

    it('marks the component name item as inactive when a part is present', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockCard, 'Front');
      const componentItem = crumbs[crumbs.length - 2];
      expect(componentItem.label).toBe('Hero Card');
      expect(componentItem.isActive).toBe(false);
    });

    it('adds front/back partOptions for a Card component', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockCard, 'Front');
      const partItem = crumbs[crumbs.length - 1];
      expect(partItem.partOptions).toHaveLength(2);
      expect(partItem.partOptions).toContainEqual({
        label: 'Front',
        value: 'front',
        href: `${projectUrl}/components/c1/front`
      });
      expect(partItem.partOptions).toContainEqual({
        label: 'Back',
        value: 'back',
        href: `${projectUrl}/components/c1/back`
      });
    });

    it('does not add partOptions for a PlayerMat component', () => {
      const crumbs = buildEditorBreadcrumbs(project, mockPlayerMat, 'Front');
      const partItem = crumbs[crumbs.length - 1];
      expect(partItem.partOptions).toBeUndefined();
    });
  });
});

describe('buildComponentExportBreadcrumbs', () => {
  it('ends with an Export breadcrumb', () => {
    const crumbs = buildComponentExportBreadcrumbs(project, mockCard);
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Export');
    expect(last.href).toBe(`${projectUrl}/components/c1/export`);
    expect(last.isActive).toBe(true);
  });

  it('includes the component name before Export', () => {
    const crumbs = buildComponentExportBreadcrumbs(project, mockCard);
    const componentItem = crumbs[crumbs.length - 2];
    expect(componentItem.label).toBe('Hero Card');
    expect(componentItem.href).toBe(`${projectUrl}/components/c1/front`);
  });
});

describe('buildDataSourcesBreadcrumbs', () => {
  it('ends with a Data Sources breadcrumb', () => {
    const crumbs = buildDataSourcesBreadcrumbs(project);
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Data Sources');
    expect(last.href).toBe(`${projectUrl}/data-sources`);
    expect(last.isActive).toBe(true);
  });
});

describe('buildDataSourceBreadcrumbs', () => {
  it('ends with the data source name as the active item', () => {
    const crumbs = buildDataSourceBreadcrumbs(project, 'ds1', 'My Sheet');
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('My Sheet');
    expect(last.href).toBe(`${projectUrl}/data-sources/ds1`);
    expect(last.isActive).toBe(true);
  });
});

describe('buildDataSourceEditBreadcrumbs', () => {
  it('includes a Data Sources link before the data source name', () => {
    const crumbs = buildDataSourceEditBreadcrumbs(project, 'ds1', 'My Sheet');
    const dataSourcesItem = crumbs.find((c) => c.label === 'Data Sources');
    expect(dataSourcesItem).toBeDefined();
    expect(dataSourcesItem!.href).toBe(`${projectUrl}/data-sources`);
    expect(dataSourcesItem!.isActive).toBeFalsy();
  });

  it('ends with the data source name linking to its edit URL', () => {
    const crumbs = buildDataSourceEditBreadcrumbs(project, 'ds1', 'My Sheet');
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('My Sheet');
    expect(last.href).toBe(`${projectUrl}/data-sources/ds1/edit`);
    expect(last.isActive).toBe(true);
  });
});

describe('buildAdminBreadcrumbs', () => {
  it('returns a single Admin breadcrumb', () => {
    const crumbs = buildAdminBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0].label).toBe('Admin');
    expect(crumbs[0].href).toBe('/admin');
    expect(crumbs[0].isActive).toBe(true);
  });
});

describe('buildAdminSamplesBreadcrumbs', () => {
  it('ends with a Samples breadcrumb', () => {
    const crumbs = buildAdminSamplesBreadcrumbs();
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Samples');
    expect(last.href).toBe('/admin/samples');
    expect(last.isActive).toBe(true);
  });

  it('includes Admin as an inactive preceding breadcrumb', () => {
    const [admin] = buildAdminSamplesBreadcrumbs();
    expect(admin.label).toBe('Admin');
    expect(admin.isActive).toBe(false);
  });
});

describe('buildAdminSampleEditorBreadcrumbs', () => {
  const sampleComponent = mockCard as EditableComponent;

  it('ends with a "<partLabel> Design" breadcrumb', () => {
    const crumbs = buildAdminSampleEditorBreadcrumbs(sampleComponent, 'front', 'Front');
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Front Design');
    expect(last.href).toBe(`/admin/samples/c1/front`);
    expect(last.isActive).toBe(true);
  });

  it('includes the component name before the design part', () => {
    const crumbs = buildAdminSampleEditorBreadcrumbs(sampleComponent, 'back', 'Back');
    const componentItem = crumbs[crumbs.length - 2];
    expect(componentItem.label).toBe('Hero Card');
    expect(componentItem.href).toBe(`/admin/samples/c1/front`);
  });
});

describe('buildAdminUsersBreadcrumbs', () => {
  it('ends with a Users breadcrumb', () => {
    const crumbs = buildAdminUsersBreadcrumbs();
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Users');
    expect(last.href).toBe('/admin/users');
    expect(last.isActive).toBe(true);
  });
});

describe('buildAdminDataSourcesBreadcrumbs', () => {
  it('ends with a Data Sources breadcrumb', () => {
    const crumbs = buildAdminDataSourcesBreadcrumbs();
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Data Sources');
    expect(last.href).toBe('/admin/data-sources');
    expect(last.isActive).toBe(true);
  });
});

describe('buildAdminDataSourceEditorBreadcrumbs', () => {
  it('ends with the data source name as the active item', () => {
    const crumbs = buildAdminDataSourceEditorBreadcrumbs('Global Sheet', 'ds99');
    const last = crumbs[crumbs.length - 1];
    expect(last.label).toBe('Global Sheet');
    expect(last.href).toBe('/admin/data-sources/ds99');
    expect(last.isActive).toBe(true);
  });

  it('includes an inactive Data Sources breadcrumb', () => {
    const crumbs = buildAdminDataSourceEditorBreadcrumbs('Global Sheet', 'ds99');
    const dataSourcesItem = crumbs.find((c) => c.label === 'Data Sources');
    expect(dataSourcesItem).toBeDefined();
    expect(dataSourcesItem!.isActive).toBe(false);
  });
});
