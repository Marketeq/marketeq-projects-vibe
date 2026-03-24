// PM2 Ecosystem Config — local dev process manager
// Usage:
//   npx pm2 start ecosystem.config.js        # start all core services
//   npx pm2 status                            # check service status
//   npx pm2 logs                              # tail all logs
//   npx pm2 logs api-gateway                  # tail specific service
//   npx pm2 restart all                       # restart everything
//   npx pm2 stop all                          # stop everything
//   npx pm2 delete all                        # remove all from pm2

module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'npx',
      args: 'nest start api-gateway',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 4000, NODE_ENV: 'development' },
    },
    {
      name: 'auth-service',
      script: 'npx',
      args: 'nest start auth-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3001, NODE_ENV: 'development' },
    },
    {
      name: 'user-service',
      script: 'npx',
      args: 'nest start user-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3002, NODE_ENV: 'development' },
    },
    {
      name: 'listings-service',
      script: 'npx',
      args: 'nest start listings-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3003, NODE_ENV: 'development' },
    },
    {
      name: 'checkout-service',
      script: 'npx',
      args: 'nest start checkout-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3009, NODE_ENV: 'development' },
    },
    {
      name: 'messaging-service',
      script: 'npx',
      args: 'nest start messaging-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3005, NODE_ENV: 'development' },
    },
    {
      name: 'notification-service',
      script: 'npx',
      args: 'nest start notification-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3006, NODE_ENV: 'development' },
    },
    {
      name: 'favorites-service',
      script: 'npx',
      args: 'nest start favorites-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3012, NODE_ENV: 'development' },
    },
    {
      name: 'contracts-service',
      script: 'npx',
      args: 'nest start contracts-service',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3010, NODE_ENV: 'development' },
    },
  ],
};
