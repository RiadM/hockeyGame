// PM2 Ecosystem Configuration
module.exports = {
  apps: [{
    name: 'hockey-lobby-server',
    script: './server/index.js',
    cwd: '/var/www/hockey-game',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      CORS_ORIGIN: 'https://yourdomain.com'
    },
    error_file: '/var/log/pm2/hockey-lobby-error.log',
    out_file: '/var/log/pm2/hockey-lobby-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
