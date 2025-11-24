import { env } from '$env/dynamic/public';

export const config = {
  apiUrl: env.PUBLIC_API_URL || 'https://localhost:7262'
};
