import express from 'express';
import { User } from '../db/database.js';
import { validatePasswordStrength } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'נא להזין אימייל וסיסמה'
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'אימייל או סיסמה שגויים'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'החשבון מושבת. אנא פנה למנהל המערכת'
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'אימייל או סיסמה שגויים'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // SECURITY FIX: Regenerate session ID to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          error: 'Session error',
          message: 'שגיאה ביצירת הפעלת התחברות'
        });
      }

      // Create session with new ID
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.role = user.role;
      req.session.mustChangePassword = user.mustChangePassword;

      res.json({
        success: true,
        message: 'התחברת בהצלחה',
        user: user.toSafeObject(),
        mustChangePassword: user.mustChangePassword
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'שגיאה בהתחברות למערכת'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Logout failed',
        message: 'שגיאה בניתוק מהמערכת'
      });
    }

    res.json({
      success: true,
      message: 'התנתקת בהצלחה'
    });
  });
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      req.session.destroy();
      return res.status(404).json({
        error: 'User not found',
        message: 'משתמש לא נמצא'
      });
    }

    res.json({
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'שגיאה בקבלת פרטי משתמש'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing passwords',
        message: 'נא להזין סיסמה נוכחית וסיסמה חדשה'
      });
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'הסיסמה אינה עומדת בדרישות',
        errors: validation.errors
      });
    }

    // Get user
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'משתמש לא נמצא'
      });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'הסיסמה הנוכחית שגויה'
      });
    }

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    // Update session
    req.session.mustChangePassword = false;

    res.json({
      success: true,
      message: 'הסיסמה שונתה בהצלחה',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'שגיאה בשינוי סיסמה'
    });
  }
});

/**
 * POST /api/auth/validate-password
 * Validate password strength (for client-side validation)
 */
router.post('/validate-password', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      error: 'Missing password',
      message: 'נא להזין סיסמה'
    });
  }

  const validation = validatePasswordStrength(password);

  res.json(validation);
});

export default router;
