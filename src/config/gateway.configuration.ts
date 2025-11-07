export default () => {
  let serviceEndpoints;

  try {
    // Try to parse SERVICE_ENDPOINTS from environment variable
    serviceEndpoints = process.env.SERVICE_ENDPOINTS
      ? JSON.parse(process.env.SERVICE_ENDPOINTS)
      : [{ name: 'countries', url: 'https://countries.trevorblades.com/' }];
  } catch (error) {
    console.warn('Failed to parse SERVICE_ENDPOINTS, using default');
    serviceEndpoints = [
      { name: 'countries', url: 'https://countries.trevorblades.com/' },
    ];
  }

  return {
    serviceEndpoints,
    apiEndpoints: {
      api: {
        host: process.env.API_HOST || '*',
        paths: process.env.API_PATHS || '/',
      },
    },
    policies: ['proxy', 'key-auth', 'rate-limit'],
    pipelines: {
      default: {
        apiEndpoints: ['api'],
        policies: [
          {
            'key-auth': {
              action: {
                apiEndpoints: 'api',
              },
            },
          },
          {
            proxy: {
              action: {
                serviceEndpoint: 'countries',
              },
            },
          },
        ],
      },
    },
  };
};
