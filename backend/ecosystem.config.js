// PM2 Ecosystem Config — local dev process manager
// Usage:
//   npm run build:all                           # build all services first
//   npx pm2 start ecosystem.config.js           # start all core services
//   npx pm2 status                              # check service status
//   npx pm2 logs                                # tail all logs
//   npx pm2 logs api-gateway                    # tail specific service
//   npx pm2 restart all                         # restart everything
//   npx pm2 stop all                            # stop everything
//   npx pm2 delete all                          # remove all from pm2

// Run pre-compiled JS directly to avoid OOM during tsc compilation.
// Build first with: npx nest build <service> (or npm run build:all)
const svc = (name, port, extraEnv) => ({
  name,
  script: `dist/apps/${name}/main.js`,
  cwd: __dirname,
  autorestart: true,
  watch: false,
  max_restarts: 10,
  restart_delay: 2000,
  node_args: '--max-old-space-size=256',
  env: { PORT: port, NODE_ENV: 'development', ...extraEnv },
});

// Some services compile with nested paths (tsconfig rootDir differences)
const svcNested = (name, port, extraEnv) => ({
  ...svc(name, port, extraEnv),
  script: `dist/apps/${name}/apps/${name}/src/main.js`,
});

module.exports = {
  apps: [
    svc('api-gateway', 4000),
    svc('auth-service', 3001),
    { ...svc('user-service', 3002), node_args: '--max-old-space-size=1024' },
    svc('listings-service', 3004, { LISTINGS_DATABASE_SYNCHRONIZE: 'true' }),
    svc('checkout-service', 3009),
    svcNested('messaging-service', 3005),
    svcNested('notification-service', 3006),
    svcNested('favorites-service', 3012),
    svc('contracts-service', 3010),
    svc('time-tracking-service', 3017),
    svcNested('invitations-service', 3013),
    svc('category-service', 3023),
    svc('autocomplete-service', 3016),
    svc('transaction-service', 3018),
    svc('suggestions-service', 3021),
    svc('billing-service', 3027),
    svc('pricing-service', 3029),
    svc('portfolio-service', 3015),
    svc('content-moderation-service', 3014),
    svc('search-service', 3007),
    svc('earnings-service', 3026),
    svc('payout-service', 3022),
    svc('offer-service', 3025),
    {
      name: 'cms-service',
      script: 'npm',
      args: 'run start:dev',
      cwd: `${__dirname}/apps/cms-service`,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3020, NODE_ENV: 'development' },
    },
    {
      name: 'scheduling-service',
      script: 'npm',
      args: 'run start:dev',
      cwd: `${__dirname}/apps/scheduling-service`,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: { PORT: 3024, NODE_ENV: 'development' },
    },
  ],
};
