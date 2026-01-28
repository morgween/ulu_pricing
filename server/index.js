// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import SequelizeStore from 'connect-session-sequelize';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { initializeDatabase, sequelize, User } from './db/database.js';
import { requireAuth, requireAdmin, checkPasswordChange, attachUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';
// SECURITY FIX: Require SESSION_SECRET to be set in environment
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('FATAL ERROR: SESSION_SECRET environment variable is required for security.');
  console.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// ============= MIDDLEWARE =============

// Trust proxy - required when behind reverse proxy (Caddy)
app.set('trust proxy', true);

// SECURITY FIX: Configure CORS with whitelisted origins instead of accepting all
const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
// Allow localhost in development for testing
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.length === 0) {
      // If no origins configured, log warning but allow same-origin
      console.warn('WARNING: CORS_ORIGINS not configured. Only same-origin requests recommended.');
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// SECURITY FIX: Configure persistent session store with Sequelize
const SessionStore = SequelizeStore(session.Store);
const sessionStore = new SessionStore({
  db: sequelize,
  checkExpirationInterval: 15 * 60 * 1000, // Clean up expired sessions every 15 minutes
  expiration: 24 * 60 * 60 * 1000 // Session expiration: 24 hours
});

// Session middleware
app.use(session({
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    sameSite: 'lax', // Allow cookies in normal navigation (important for incognito)
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Comprehensive connection logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Get client IP (considering proxies)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection.remoteAddress
    || req.socket.remoteAddress;

  // Log incoming request
  console.log(`[${timestamp}] INCOMING: ${req.method} ${req.url} | IP: ${clientIp} | User-Agent: ${req.headers['user-agent'] || 'N/A'}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] RESPONSE: ${req.method} ${req.url} | Status: ${res.statusCode} | IP: ${clientIp} | Duration: ${duration}ms`);
  });

  next();
});

// Attach user to request
app.use(attachUser(User));

// Serve static files but exclude protected HTML pages
app.use((req, res, next) => {
  // List of protected HTML files and paths
  const protectedPages = ['/', '/index.html', '/admin.html', '/change-password.html'];

  // If requesting a protected page, skip static handler and let route handlers deal with it
  if (protectedPages.includes(req.path)) {
    return next();
  }

  // Prevent caching of configuration files
  if (req.path === '/config.js' || req.path === '/src/quotas.js') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Last-Modified', new Date().toUTCString());
  }

  // Otherwise serve static files
  express.static(path.join(__dirname, '../public'))(req, res, next);
});

// ============= PATHS =============

const CONFIG_PATH = path.join(__dirname, '../public/config.js');
const QUOTAS_PATH = path.join(__dirname, '../public/src/quotas.js');
const CONFIG_DATA_PATH = path.join(__dirname, 'data/config.json');
const QUOTAS_DATA_PATH = path.join(__dirname, 'data/quotas.json');

// Ensure data directory exists
await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });

// ============= HELPER FUNCTIONS =============

async function parseConfigJS() {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8');
    const match = content.match(/window\.WINERY_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      const configStr = match[1];
      // SECURITY FIX: Replace eval() with JSON.parse() to prevent code injection
      const config = JSON.parse(configStr);
      return config;
    }
  } catch (error) {
    console.error('Error parsing config.js:', error);
  }
  return null;
}

async function parseQuotasJS() {
  try {
    const content = await fs.readFile(QUOTAS_PATH, 'utf-8');
    const match = content.match(/window\.DEFAULT_QUOTAS\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      const quotasStr = match[1];
      // SECURITY FIX: Replace eval() with JSON.parse() to prevent code injection
      const quotas = JSON.parse(quotasStr);
      return quotas;
    }
  } catch (error) {
    console.error('Error parsing quotas.js:', error);
  }
  return [];
}

async function writeConfigJS(config) {
  const jsContent = `// קובץ הגדרות תמחור – גרסת מחשבון האירועים
window.WINERY_CONFIG = ${JSON.stringify(config, null, 2)};
`;
  await fs.writeFile(CONFIG_PATH, jsContent, 'utf-8');
}

async function writeQuotasJS(quotas) {
  const jsContent = `// תוספות ברירת מחדל
window.DEFAULT_QUOTAS = ${JSON.stringify(quotas, null, 2)};
`;
  await fs.writeFile(QUOTAS_PATH, jsContent, 'utf-8');
}

async function initializeDataFiles() {
  try {
    await fs.access(CONFIG_DATA_PATH);
  } catch {
    console.log('Initializing config.json from config.js...');
    const config = await parseConfigJS();
    if (config) {
      await fs.writeFile(CONFIG_DATA_PATH, JSON.stringify(config, null, 2));
      console.log('✓ config.json initialized');
    }
  }

  try {
    await fs.access(QUOTAS_DATA_PATH);
  } catch {
    console.log('Initializing quotas.json from quotas.js...');
    const quotas = await parseQuotasJS();
    if (quotas) {
      await fs.writeFile(QUOTAS_DATA_PATH, JSON.stringify(quotas, null, 2));
      console.log('✓ quotas.json initialized');
    }
  }
}

// ============= CONFIG MIGRATION =============

/**
 * Migrate old config format to new format
 * Converts legacy field names to current naming conventions
 */
function migrateConfig(config) {
  const migrated = { ...config };

  // Migrate drinks structure
  if (migrated.drinks) {
    // Migrate hot drinks
    if (migrated.drinks.hot) {
      const hot = migrated.drinks.hot;

      // Convert cost_exVAT to costPerUnit
      if (hot.cost_exVAT !== undefined && hot.costPerUnit === undefined) {
        hot.costPerUnit = hot.cost_exVAT;
        delete hot.cost_exVAT;
      }

      // Convert priceMultiplier to pricePerUnit
      if (hot.priceMultiplier !== undefined && hot.costPerUnit !== undefined && hot.pricePerUnit === undefined) {
        hot.pricePerUnit = hot.costPerUnit * hot.priceMultiplier;
        delete hot.priceMultiplier;
      }
    }

    // Migrate cold drinks
    if (migrated.drinks.cold) {
      const cold = migrated.drinks.cold;

      // Convert cost_exVAT to costPerUnit
      if (cold.cost_exVAT !== undefined && cold.costPerUnit === undefined) {
        cold.costPerUnit = cold.cost_exVAT;
        delete cold.cost_exVAT;
      }

      // Convert priceMultiplier to pricePerUnit
      if (cold.priceMultiplier !== undefined && cold.costPerUnit !== undefined && cold.pricePerUnit === undefined) {
        cold.pricePerUnit = cold.costPerUnit * cold.priceMultiplier;
        delete cold.priceMultiplier;
      }
    }

    // Migrate counts_by_duration to ratesByDuration
    if (migrated.drinks.counts_by_duration && !migrated.drinks.ratesByDuration) {
      migrated.drinks.ratesByDuration = migrated.drinks.counts_by_duration;
      delete migrated.drinks.counts_by_duration;
    }
  }

  return migrated;
}

// ============= RATE LIMITING =============

// SECURITY FIX: Rate limiting for authentication endpoints to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts',
    message: 'יותר מדי ניסיונות התחברות. אנא נסה שוב מאוחר יותר'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to login endpoint
app.use('/api/auth/login', loginLimiter);

// ============= AUTHENTICATION ROUTES =============

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ============= PROTECTED API ENDPOINTS =============

// Protect all /api/* routes except auth
app.use('/api/*', requireAuth, checkPasswordChange);

/**
 * GET /api/config - Get current configuration (requires auth)
 */
app.get('/api/config', async (req, res) => {
  try {
    const data = await fs.readFile(CONFIG_DATA_PATH, 'utf-8');
    let config = JSON.parse(data);

    // Apply migration to handle legacy field names
    config = migrateConfig(config);

    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

/**
 * PUT /api/config - Update configuration (requires admin)
 */
app.put('/api/config', requireAdmin, async (req, res) => {
  try {
    const config = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration data' });
    }

    await fs.writeFile(CONFIG_DATA_PATH, JSON.stringify(config, null, 2));
    await writeConfigJS(config);

    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * GET /api/quotas - Get default quotas (requires auth)
 */
app.get('/api/quotas', async (req, res) => {
  try {
    const data = await fs.readFile(QUOTAS_DATA_PATH, 'utf-8');
    const quotas = JSON.parse(data);
    res.json(quotas);
  } catch (error) {
    console.error('Error reading quotas:', error);
    res.status(500).json({ error: 'Failed to read quotas' });
  }
});

/**
 * PUT /api/quotas - Update quotas (requires admin)
 */
app.put('/api/quotas', requireAdmin, async (req, res) => {
  try {
    const quotas = req.body;

    if (!Array.isArray(quotas)) {
      return res.status(400).json({ error: 'Invalid quotas data' });
    }

    await fs.writeFile(QUOTAS_DATA_PATH, JSON.stringify(quotas, null, 2));
    await writeQuotasJS(quotas);

    res.json({ success: true, message: 'Quotas updated successfully' });
  } catch (error) {
    console.error('Error updating quotas:', error);
    res.status(500).json({ error: 'Failed to update quotas' });
  }
});

/**
 * GET /api/health - Health check endpoint (public)
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    authenticated: !!req.session?.userId
  });
});

// ============= PAGE ROUTES =============

// Root redirects to login if not authenticated
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.redirect('/login.html');
  }
});

// Calculator page requires authentication
app.get('/index.html', requireAuth, checkPasswordChange, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Admin page requires admin role
app.get('/admin.html', requireAuth, checkPasswordChange, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Change password page (requires auth but NOT password change check)
app.get('/change-password.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/change-password.html'));
});

// ============= ERROR HANDLING =============

// 404 Handler - Must be after all other routes
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Error Handler - Must be last
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // For API routes, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'שגיאת שרת פנימית'
    });
  }

  // For page routes, return HTML error page
  res.status(500).sendFile(path.join(__dirname, '../public/500.html'));
});

// ============= INITIALIZATION & STARTUP =============

// Initialize database and data files
await initializeDatabase();
// Sync session store table
await sessionStore.sync();
console.log('✓ Session store synced');
await initializeDataFiles();

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🍷 Ulu Winery Calculator Server                          ║
║  ✓ Server running on http://localhost:${PORT}            ║
║  ✓ API available at http://localhost:${PORT}/api         ║
║  ✓ Login at http://localhost:${PORT}/login.html          ║
║  ✓ Admin panel at http://localhost:${PORT}/admin.html    ║
║  ✓ Authentication: ENABLED                                ║
║  ✓ Default admin: admin@ulu-winery.co.il / Admin123!     ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await sequelize.close();
  process.exit(0);
});
