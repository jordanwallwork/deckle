import type { FileDirectory } from '$lib/types';

export interface Breadcrumb {
  label: string;
  href: string;
  // Folder the crumb points at: null for the library root, undefined if it couldn't be resolved
  directoryId: string | null | undefined;
}

// One crumb for the library root, then one per folder in the path, each linking to that folder
export function buildBreadcrumbs(
  baseUrl: string,
  path: string,
  directories: FileDirectory[] = []
): Breadcrumb[] {
  const segments = path.split('/').filter(Boolean);
  const crumbs: Breadcrumb[] = [{ label: 'Image Library', href: baseUrl, directoryId: null }];

  let parentId: string | null | undefined = null;
  segments.forEach((segment, i) => {
    parentId =
      parentId === undefined
        ? undefined
        : directories.find((d) => d.parentDirectoryId === parentId && d.name === segment)?.id;
    crumbs.push({
      label: segment,
      href: `${baseUrl}/${segments
        .slice(0, i + 1)
        .map(encodeURIComponent)
        .join('/')}`,
      directoryId: parentId
    });
  });
  return crumbs;
}
