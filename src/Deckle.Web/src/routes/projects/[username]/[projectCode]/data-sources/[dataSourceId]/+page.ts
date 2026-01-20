import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, parent }) => {
  return {
    dataSourceId: params.dataSourceId
  };
};
