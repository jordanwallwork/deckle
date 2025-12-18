import type { BreadcrumbItem } from '$lib/types/breadcrumb';

function extend(breadcrumbs:BreadcrumbItem[], additions:BreadcrumbItem[]): BreadcrumbItem[] {
	return [
		...breadcrumbs.map(x => ({ ...x, isActive: false })),
		...additions
	];
}

export function buildProjectBreadcrumbs(projectId: string, projectName: string): BreadcrumbItem[] {
	return [
		{ label: 'Projects', href: '/projects' },
		{ label: projectName, href: `/projects/${projectId}`, isActive: true }
	];
}

export function buildComponentsBreadcrumbs(
	projectId: string,
	projectName: string
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(projectId, projectName), [
		{ label: 'Components', href: `/projects/${projectId}/components`, isActive: true }
	]);
}

export function buildSettingsBreadcrumbs(
	projectId: string,
	projectName: string
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(projectId, projectName), [
		{ label: 'Settings', href: `/projects/${projectId}/settings`, isActive: true }
	]);
}

export function buildCardEditorBreadcrumbs(
	projectId: string,
	projectName: string,
	cardId: string,
	cardName: string,
	side?: 'Front' | 'Back'
): BreadcrumbItem[] {
	const breadcrumbs: BreadcrumbItem[] = [
		{
			label: cardName,
			href: `/projects/${projectId}/components/${cardId}/front`,
			isActive: !side
		}
	];

	if (side) {
		breadcrumbs.push({
			label: side,
			href: `/projects/${projectId}/components/${cardId}/${side.toLowerCase()}`,
			isActive: true
		});
	}

	return extend(buildComponentsBreadcrumbs(projectId, projectName), breadcrumbs);
}

export function buildDataSourcesBreadcrumbs(
	projectId: string,
	projectName: string
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(projectId, projectName), [
		{ label: 'Data Sources', href: `/projects/${projectId}/data-sources`, isActive: true }
	]);
}

export function buildDataSourceBreadcrumbs(
	projectId: string,
	projectName: string,
	dataSourceId: string,
	dataSourceName: string
): BreadcrumbItem[] {
	return extend(buildProjectBreadcrumbs(projectId, projectName), [
		{
			label: dataSourceName,
			href: `/projects/${projectId}/data-sources/${dataSourceId}`,
			isActive: true
		}
	]);
}
