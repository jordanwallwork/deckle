import type { FileDirectory } from '$lib/types';

/**
 * Add tags to an existing list, ignoring case-insensitive duplicates.
 * Existing tags keep their original casing.
 */
export function mergeTags(existing: string[], toAdd: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  for (const tag of toAdd) {
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

/**
 * Remove tags from an existing list, matching case-insensitively.
 */
export function subtractTags(existing: string[], toRemove: string[]): string[] {
  const removing = new Set(toRemove.map((t) => t.trim().toLowerCase()));
  return existing.filter((t) => !removing.has(t.toLowerCase()));
}

/**
 * Sorted, case-insensitively de-duplicated union of tags across files.
 */
export function unionTags(tagLists: string[][]): string[] {
  return mergeTags([], tagLists.flat()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export type BatchResult<T> = { succeeded: T[]; failed: T[] };

/**
 * Run an async operation over items with limited concurrency.
 * A failing item doesn't stop the rest of the batch.
 */
export async function runBatch<T>(
  items: T[],
  op: (item: T) => Promise<unknown>,
  concurrency = 4
): Promise<BatchResult<T>> {
  const succeeded: T[] = [];
  const failed: T[] = [];
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        await op(item);
        succeeded.push(item);
      } catch (err) {
        console.error('Batch operation failed:', err);
        failed.push(item);
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return { succeeded, failed };
}

export type DirectoryTreeNode = { directory: FileDirectory; depth: number };

/**
 * Flatten directories into depth-first display order (alphabetical within each level).
 * Excluded directories and all their descendants are omitted.
 */
export function buildDirectoryTree(
  directories: FileDirectory[],
  excludedIds: Iterable<string> = []
): DirectoryTreeNode[] {
  const excluded = new Set(excludedIds);
  const childrenOf = new Map<string | null, FileDirectory[]>();
  for (const dir of directories) {
    const siblings = childrenOf.get(dir.parentDirectoryId) ?? [];
    siblings.push(dir);
    childrenOf.set(dir.parentDirectoryId, siblings);
  }

  const result: DirectoryTreeNode[] = [];
  function visit(parentId: string | null, depth: number) {
    const children = (childrenOf.get(parentId) ?? [])
      .filter((d) => !excluded.has(d.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    for (const directory of children) {
      result.push({ directory, depth });
      visit(directory.id, depth + 1);
    }
  }
  visit(null, 0);
  return result;
}
