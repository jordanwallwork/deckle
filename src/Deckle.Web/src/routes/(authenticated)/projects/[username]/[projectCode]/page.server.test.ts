import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

describe('project root page load', () => {
  it('redirects to the components sub-page', () => {
    const event = { params: { username: 'alice', projectCode: 'PROJ' } } as any;
    let thrown: unknown;
    try {
      load(event);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toMatchObject({
      status: 302,
      location: '/projects/alice/PROJ/components'
    });
  });
});
