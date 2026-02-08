import type { Component, Project, GameComponent, EditableComponent } from '$lib/types';
import type { BreadcrumbItem } from '$lib/types/breadcrumb';

type ProjectIdName = Project | { id: string; name: string; ownerUsername: string; code: string };
type ComponentIdName = Component | { id: string; name: string };

function getProjectUrl(project: ProjectIdName): string {
  return `/projects/${project.ownerUsername}/${project.code}`;
}

function extend(breadcrumbs: BreadcrumbItem[], additions: BreadcrumbItem[]): BreadcrumbItem[] {
  return [...breadcrumbs.map((x) => ({ ...x, isActive: false })), ...additions];
}

export function buildProjectBreadcrumbs(project: ProjectIdName): BreadcrumbItem[] {
  return [
    { label: 'Projects', href: '/projects' },
    { label: project.name, href: getProjectUrl(project), isActive: true }
  ];
}

export function buildComponentsBreadcrumbs(project: ProjectIdName): BreadcrumbItem[] {
  return extend(buildProjectBreadcrumbs(project), [
    { label: 'Components', href: `${getProjectUrl(project)}/components`, isActive: true }
  ]);
}

export function buildSettingsBreadcrumbs(project: ProjectIdName): BreadcrumbItem[] {
  return extend(buildProjectBreadcrumbs(project), [
    { label: 'Settings', href: `${getProjectUrl(project)}/settings`, isActive: true }
  ]);
}

export function buildEditorBreadcrumbs(
  project: ProjectIdName,
  component: GameComponent,
  part?: string
): BreadcrumbItem[] {
  const projectUrl = getProjectUrl(project);
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: component.name,
      href: `${projectUrl}/components/${component.id}/front`,
      isActive: !part
    }
  ];

  if (part) {
    const partItem: BreadcrumbItem = {
      label: part,
      href: `${projectUrl}/components/${component.id}/${part.toLowerCase()}`,
      isActive: true
    };

    // Add part options for components with multiple parts (Cards)
    if (component.type === 'Card') {
      partItem.partOptions = [
        {
          label: 'Front',
          value: 'front',
          href: `${projectUrl}/components/${component.id}/front`
        },
        {
          label: 'Back',
          value: 'back',
          href: `${projectUrl}/components/${component.id}/back`
        }
      ];
    }

    breadcrumbs.push(partItem);
  }

  return extend(buildComponentsBreadcrumbs(project), breadcrumbs);
}

export function buildComponentExportBreadcrumbs(project: ProjectIdName, component: GameComponent) {
  const projectUrl = getProjectUrl(project);
  return extend(buildComponentsBreadcrumbs(project), [
    {
      label: component.name,
      href: `${projectUrl}/components/${component.id}/front`
    },
    {
      label: 'Export',
      href: `${projectUrl}/components/${component.id}/export`,
      isActive: true
    }
  ]);
}

export function buildDataSourcesBreadcrumbs(project: ProjectIdName): BreadcrumbItem[] {
  return extend(buildProjectBreadcrumbs(project), [
    { label: 'Data Sources', href: `${getProjectUrl(project)}/data-sources`, isActive: true }
  ]);
}

export function buildDataSourceBreadcrumbs(
  project: ProjectIdName,
  dataSourceId: string,
  dataSourceName: string
): BreadcrumbItem[] {
  return extend(buildProjectBreadcrumbs(project), [
    {
      label: dataSourceName,
      href: `${getProjectUrl(project)}/data-sources/${dataSourceId}`,
      isActive: true
    }
  ]);
}

// Admin breadcrumbs

export function buildAdminBreadcrumbs(): BreadcrumbItem[] {
  return [{ label: 'Admin', href: '/admin', isActive: true }];
}

export function buildAdminSamplesBreadcrumbs(): BreadcrumbItem[] {
  return extend(buildAdminBreadcrumbs(), [
    { label: 'Samples', href: '/admin/samples', isActive: true }
  ]);
}

export function buildAdminSampleEditorBreadcrumbs(
  component: EditableComponent,
  part: string,
  partLabel: string
): BreadcrumbItem[] {
  return extend(buildAdminSamplesBreadcrumbs(), [
    { label: component.name, href: `/admin/samples/${component.id}/front` },
    {
      label: `${partLabel} Design`,
      href: `/admin/samples/${component.id}/${part}`,
      isActive: true
    }
  ]);
}

export function buildAdminUsersBreadcrumbs(): BreadcrumbItem[] {
  return extend(buildAdminBreadcrumbs(), [
    { label: 'Users', href: '/admin/users', isActive: true }
  ]);
}

export function buildAdminDataSourcesBreadcrumbs(): BreadcrumbItem[] {
  return extend(buildAdminBreadcrumbs(), [
    { label: 'Data Sources', href: '/admin/data-sources', isActive: true }
  ]);
}

export function buildAdminDataSourceEditorBreadcrumbs(
  name: string,
  id: string
): BreadcrumbItem[] {
  return extend(buildAdminDataSourcesBreadcrumbs(), [
    { label: name, href: `/admin/data-sources/${id}`, isActive: true }
  ]);
}
