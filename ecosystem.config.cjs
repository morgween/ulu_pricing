module.exports = {
  apps: [{
    name: 'ulu-calculator',
    script: './server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Load environment variables from .env file
    env_file: './.env'
  }]
};
