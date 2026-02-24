import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

describe('project root page load', () => {
  it('redirects to the components sub-page', async () => {
    const event = { params: { username: 'alice', projectCode: 'PROJ' } } as any;
    await expect(load(event)).rejects.toMatchObject({
      status: 302,
      location: '/projects/alice/PROJ/components'
    });
  });
});
