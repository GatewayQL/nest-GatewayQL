export default () => ({
  http: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  https: {
    port: parseInt(process.env.HTTPS_PORT, 10) || 3443,
    tls: {},
  },
  admin: {
    port: parseInt(process.env.ADMIN_PORT, 10) || 9080,
  },
  db: {
    type: process.env.DB_TYPE || 'postgres',
    retryAttempts: 3,
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'gatewayql',
    ssl: process.env.DB_SSL === 'true' || false,
  },
  crypto: {
    cipherKey: process.env.CIPHER_KEY || 'change-this-32-char-key-in-prod',
    algorithm: process.env.CIPHER_ALGORITHM || 'aes-256-cbc',
    saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    signOptions: {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  },
});
