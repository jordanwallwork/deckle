import type { Component, Project, GameComponent } from '$lib/types';
import type { BreadcrumbItem } from '$lib/types/breadcrumb';

type ProjectIdName = Project | { id: string, name: string};
type ComponentIdName = Component | { id: string, name: string};

function extend(breadcrumbs:BreadcrumbItem[], additions:BreadcrumbItem[]): BreadcrumbItem[] {
	return [
		...breadcrumbs.map(x => ({ ...x, isActive: false })),
		...additions
	];
}

export function buildProjectBreadcrumbs(project:ProjectIdName): BreadcrumbItem[] {
	return [
		{ label: 'Projects', href: '/projects' },
		{ label: project.name, href: `/projects/${project.id}`, isActive: true }
	];
}

export function buildComponentsBreadcrumbs(
	project: ProjectIdName
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(project), [
		{ label: 'Components', href: `/projects/${project.id}/components`, isActive: true }
	]);
}

export function buildSettingsBreadcrumbs(
	project: ProjectIdName
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(project), [
		{ label: 'Settings', href: `/projects/${project.id}/settings`, isActive: true }
	]);
}

export function buildEditorBreadcrumbs(
	project: ProjectIdName,
	component: GameComponent,
	part?: string
): BreadcrumbItem[] {
	const breadcrumbs: BreadcrumbItem[] = [
		{
			label: component.name,
			href: `/projects/${project.id}/components/${component.id}/front`,
			isActive: !part
		}
	];

	if (part) {
		const partItem: BreadcrumbItem = {
			label: part,
			href: `/projects/${project.id}/components/${component.id}/${part.toLowerCase()}`,
			isActive: true
		};

		// Add part options for components with multiple parts (Cards)
		if (component.type === 'Card') {
			partItem.partOptions = [
				{
					label: 'Front',
					value: 'front',
					href: `/projects/${project.id}/components/${component.id}/front`
				},
				{
					label: 'Back',
					value: 'back',
					href: `/projects/${project.id}/components/${component.id}/back`
				}
			];
		}

		breadcrumbs.push(partItem);
	}

	return extend(buildComponentsBreadcrumbs(project), breadcrumbs);
}

export function buildComponentExportBreadcrumbs(
	project: ProjectIdName,
	component: GameComponent) {
		return extend(buildComponentsBreadcrumbs(project), [
			{
			label: component.name,
			href: `/projects/${project.id}/components/${component.id}/front`
		},
			{
				label: 'Export',
				href: `/projects/${project.id}/components/${component.id}/export`,
				isActive: true
			}
		]);
	}

export function buildDataSourcesBreadcrumbs(
	project:ProjectIdName
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(project), [
		{ label: 'Data Sources', href: `/projects/${project.id}/data-sources`, isActive: true }
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
			href: `/projects/${project.id}/data-sources/${dataSourceId}`,
			isActive: true
		}
	]);
}
