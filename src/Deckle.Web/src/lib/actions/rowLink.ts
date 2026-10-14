import type { Action } from 'svelte/action';
import { goto } from '$app/navigation';

/** Elements that handle their own clicks; a click inside one must not also navigate the row. */
const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, summary, [role="button"]';

/** True when the click started on an interactive element inside `container`. */
export function isInteractiveClick(target: EventTarget | null, container: Element): boolean {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return interactive !== null && interactive !== container && container.contains(interactive);
}

/**
 * Makes a table row (or any element) navigate to `href` when clicked.
 *
 * This is a mouse convenience: the row must still contain a real link to the same
 * destination for keyboard and assistive-technology users. Clicks on links, buttons
 * and form controls inside the row are left alone. Adds the `row-link` class, which
 * `Table` styles with a pointer cursor and hover background.
 */
export const rowLink: Action<HTMLElement, string> = (node, href) => {
  let current = href;

  function handleClick(event: MouseEvent) {
    if (event.defaultPrevented || isInteractiveClick(event.target, node)) return;
    goto(current);
  }

  node.classList.add('row-link');
  node.addEventListener('click', handleClick);

  return {
    update(next: string) {
      current = next;
    },
    destroy() {
      node.classList.remove('row-link');
      node.removeEventListener('click', handleClick);
    }
  };
};
