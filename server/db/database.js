import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineUserModel } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database path
const DB_PATH = path.join(__dirname, '../data/users.sqlite');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false, // Set to console.log to see SQL queries
  define: {
    timestamps: true,
    underscored: false
  }
});

// Define models
export const User = defineUserModel(sequelize);

/**
 * Initialize database and create default admin user
 */
export async function initializeDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync models (create tables if they don't exist)
    await sequelize.sync();
    console.log('✓ Database models synchronized');

    // Check if any users exist
    const userCount = await User.count();
    console.log(`📊 Found ${userCount} users in database`);

    if (userCount === 0) {
      console.log('🔧 Creating default admin user...');
      // Create default admin user
      const adminUser = await User.create({
        fullName: 'Admin',
        email: 'admin@ulu-winery.co.il',
        password: 'Admin123!', // Default password - must be changed on first login
        role: 'admin',
        mustChangePassword: true,
        isActive: true
      });

      console.log('✓ Default admin user created');
      console.log('  Email: admin@ulu-winery.co.il');
      console.log('  Password: Admin123!');
      console.log('  ⚠️  Please change password on first login');
      console.log('  User ID:', adminUser.id);
    } else {
      console.log('ℹ️  Users already exist, skipping default admin creation');
    }

    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  await sequelize.close();
}

export { sequelize };
