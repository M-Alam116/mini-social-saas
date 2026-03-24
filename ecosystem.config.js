module.exports = {
  apps: [
    {
      name: 'mini-social-api',
      script: './dist/src/main.js',
      instances: 1, // Single instance per container to maximize cache efficiency and connection pool
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
