/**
 * Authentication Middleware
 * Protects routes and checks user permissions
 */

/**
 * Check if user is authenticated
 */
export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  // For HTML pages, redirect to login
  if (req.path.endsWith('.html') || req.path === '/') {
    return res.redirect('/login.html');
  }

  // For API requests, return JSON error
  return res.status(401).json({
    error: 'Authentication required',
    message: 'נדרשת התחברות למערכת'
  });
}

/**
 * Check if user is admin
 */
export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    // For HTML pages, redirect to login
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/login.html');
    }
    return res.status(401).json({
      error: 'Authentication required',
      message: 'נדרשת התחברות למערכת'
    });
  }

  if (req.session.role !== 'admin') {
    // For HTML pages, redirect to error page
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/403.html');
    }
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'אין לך הרשאות לגשת למשאב זה'
    });
  }

  return next();
}

/**
 * Check if user must change password
 */
export function checkPasswordChange(req, res, next) {
  if (req.session && req.session.mustChangePassword && req.path !== '/api/auth/change-password' && req.path !== '/change-password.html') {
    // For HTML pages, redirect to change password page
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/change-password.html');
    }
    // For API requests, return JSON error
    return res.status(403).json({
      error: 'Password change required',
      message: 'יש לשנות סיסמה לפני המשך שימוש במערכת',
      mustChangePassword: true
    });
  }

  return next();
}

/**
 * Attach current user to request
 */
export function attachUser(User) {
  return async (req, res, next) => {
    if (req.session && req.session.userId) {
      try {
        const user = await User.findByPk(req.session.userId);

        // SECURITY FIX: Validate user still exists and is active
        if (user && user.isActive) {
          req.user = user.toSafeObject();
        } else {
          // User deleted or deactivated - destroy invalid session
          console.warn(`Invalid session for user ${req.session.userId}: user ${!user ? 'not found' : 'inactive'}`);
          req.session.destroy((err) => {
            if (err) console.error('Error destroying invalid session:', err);
          });
        }
      } catch (error) {
        console.error('Error attaching user:', error);
      }
    }
    next();
  };
}
