/**
 * Mapping flat validation errors (`{docPath, message}`) onto the tree the editor
 * renders. `validateGameSetup` returns a flat list keyed by JSON-ish docPath
 * (e.g. `setup[2].to.blueprint`); each node/slot in the UI knows its own path
 * and asks these helpers whether it (or something under it) is in error.
 */

import type { SetupValidationError } from '$lib/gamerunner';

/** Child-list segments — errors under these belong to *nested* nodes, not the
 * node whose path is the prefix, so a node's own error note excludes them. */
const CHILD_LIST_SEGMENTS = ['.then[', '.else[', '.forEachSeat.body['];

/** True when `docPath` is `prefix`, or nested beneath it (`prefix.` / `prefix[`). */
function isUnder(docPath: string, prefix: string): boolean {
	return (
		docPath === prefix || docPath.startsWith(prefix + '.') || docPath.startsWith(prefix + '[')
	);
}

/** All errors at or beneath `prefix` (used for slot-level highlighting). */
export function errorsUnder(
	errors: SetupValidationError[],
	prefix: string
): SetupValidationError[] {
	return errors.filter((e) => isUnder(e.docPath, prefix));
}

/** Whether any error sits at or beneath `prefix` (slot wavy-underline flag). */
export function hasErrorUnder(errors: SetupValidationError[], prefix: string): boolean {
	return errors.some((e) => isUnder(e.docPath, prefix));
}

/**
 * Errors that belong to the node at `nodePath` itself — beneath its path but not
 * inside one of its nested step lists (those render their own notes). This is
 * what a node shows under its sentence.
 */
export function ownErrors(
	errors: SetupValidationError[],
	nodePath: string
): SetupValidationError[] {
	return errors.filter((e) => {
		if (!isUnder(e.docPath, nodePath)) return false;
		const suffix = e.docPath.slice(nodePath.length);
		return !CHILD_LIST_SEGMENTS.some((seg) => suffix.startsWith(seg));
	});
}
