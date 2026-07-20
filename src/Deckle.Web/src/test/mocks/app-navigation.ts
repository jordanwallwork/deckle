/**
 * Test mock for `$app/navigation`. No-op implementations sufficient for
 * component tests that merely import navigation helpers.
 */
export const goto = async () => {};
export const invalidate = async () => {};
export const invalidateAll = async () => {};
export const preloadData = async () => ({ type: 'loaded', status: 200, data: {} });
export const preloadCode = async () => {};
export const beforeNavigate = () => {};
export const afterNavigate = () => {};
export const onNavigate = () => {};
export const disableScrollHandling = () => {};
export const pushState = () => {};
export const replaceState = () => {};
