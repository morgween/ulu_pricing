import express from 'express';
import crypto from 'crypto';
import { User } from '../db/database.js';
import { validatePasswordStrength } from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';
import { sendCredentialsEmail } from '../services/email.js';

const router = express.Router();

// All routes require admin
router.use(requireAdmin);

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Return array directly for client compatibility
    res.json(users.map(u => u.toSafeObject()));

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'שגיאה בקבלת רשימת משתמשים'
    });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', async (req, res) => {
  try {
    const { fullName, email, role } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'נא להזין שם מלא ואימייל'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'האימייל כבר קיים במערכת'
      });
    }

    // Generate random initial password
    const initialPassword = generateRandomPassword();

    // Validate password
    const validation = validatePasswordStrength(initialPassword);
    if (!validation.isValid) {
      // This shouldn't happen with our generator, but check anyway
      return res.status(500).json({
        error: 'Password generation failed',
        message: 'שגיאה ביצירת סיסמה'
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password: initialPassword,
      role: role || 'user',
      mustChangePassword: true,
      isActive: true,
      createdBy: req.session.userId
    });

    // Send credentials via email
    let emailSent = false;
    try {
      await sendCredentialsEmail(email, fullName, initialPassword);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send credentials email:', emailError);
      // Continue anyway - password will be shown only if email fails
    }

    // SECURITY FIX: Only return password if email delivery failed and in development mode
    const response = {
      success: true,
      message: emailSent ? 'משתמש נוצר בהצלחה. פרטי ההתחברות נשלחו למייל' : 'משתמש נוצר בהצלחה. שגיאה בשליחת אימייל',
      user: user.toSafeObject(),
      emailSent
    };

    // Only include password if email failed to send (admin needs to manually provide it)
    if (!emailSent) {
      response.temporaryPassword = initialPassword;
      response.warning = 'IMPORTANT: Save this password securely. It will not be shown again.';
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: 'שגיאה ביצירת משתמש'
    });
  }
});

/**
 * PATCH /api/users/:id
 * Update user
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, isActive } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'משתמש לא נמצא'
      });
    }

    // Prevent self-deactivation
    if (req.session.userId === parseInt(id) && isActive === false) {
      return res.status(400).json({
        error: 'Cannot deactivate self',
        message: 'לא ניתן להשבית את עצמך'
      });
    }

    // SECURITY FIX: Check email uniqueness before updating
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already in use',
          message: 'כתובת האימייל כבר בשימוש'
        });
      }
      user.email = email;
    }

    // Update other fields
    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'משתמש עודכן בהצלחה',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'שגיאה בעדכון משתמש'
    });
  }
});

/**
 * PATCH /api/users/:id/status
 * Toggle user active status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'משתמש לא נמצא'
      });
    }

    // Prevent self-deactivation
    if (req.session.userId === parseInt(id) && isActive === false) {
      return res.status(400).json({
        error: 'Cannot deactivate self',
        message: 'לא ניתן להשבית את עצמך'
      });
    }

    // Update status
    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: isActive ? 'משתמש הופעל בהצלחה' : 'משתמש הושבת בהצלחה',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      message: 'שגיאה בעדכון סטטוס משתמש'
    });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'משתמש לא נמצא'
      });
    }

    // Generate new random password
    const newPassword = generateRandomPassword();

    // Update password
    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    // Send new credentials via email
    let emailSent = false;
    try {
      await sendCredentialsEmail(user.email, user.fullName, newPassword);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    // SECURITY FIX: Only return password if email delivery failed
    const response = {
      success: true,
      message: emailSent ? 'סיסמה אופסה בהצלחה. פרטי ההתחברות נשלחו למייל' : 'סיסמה אופסה בהצלחה. שגיאה בשליחת אימייל',
      email: user.email,
      emailSent
    };

    // Only include password if email failed to send (admin needs to manually provide it)
    if (!emailSent) {
      response.temporaryPassword = newPassword;
      response.warning = 'IMPORTANT: Save this password securely. It will not be shown again.';
    }

    res.json(response);

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: 'שגיאה באיפוס סיסמה'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.session.userId === parseInt(id)) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'לא ניתן למחוק את עצמך'
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'משתמש לא נמצא'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'משתמש נמחק בהצלחה'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'שגיאה במחיקת משתמש'
    });
  }
});

/**
 * Generate random strong password using cryptographically secure randomization
 */
function generateRandomPassword() {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Excluding i, l, o
  const numbers = '23456789'; // Excluding 0, 1
  const special = '!@#$%^&*';

  const all = uppercase + lowercase + numbers + special;

  // SECURITY FIX: Use crypto.randomInt instead of Math.random
  // Ensure at least one of each type
  let password = '';
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];

  // Fill rest with random characters
  for (let i = 4; i < 12; i++) {
    password += all[crypto.randomInt(0, all.length)];
  }

  // Shuffle password using Fisher-Yates algorithm with crypto.randomInt
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join('');
}

export default router;
