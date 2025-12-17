require('dotenv').config();
const app = require('./app.js');

const PORT = process.env.PORT || 4100;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`
    🎓 University Admission System
    📍 Environment: ${process.env.NODE_ENV || 'development'}
    🌐 Server: http://${HOST}:${PORT}
    ⚡ PID: ${process.pid}
    📅 Started: ${new Date().toISOString()}
  `);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));