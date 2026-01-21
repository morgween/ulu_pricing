/**
 * PM2 Ecosystem Configuration
 * For production deployment with PM2 process manager
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [{
    name: 'ulu-calculator',
    script: './server/index.js',

    // Instances
    instances: 1,
    exec_mode: 'cluster',

    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logging
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Restart behavior
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'server/data'],
    max_memory_restart: '500M',

    // Auto restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,

    // Cron restart (optional - restart daily at 3 AM)
    // cron_restart: '0 3 * * *',
  }]
};
