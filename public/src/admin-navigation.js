/**
 * Admin Navigation Button
 * Shows "Go to Admin" button in calculator for admin users only
 */

(async function() {
  try {
    // Fetch current user info
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });

    if (!response.ok) {
      // User not authenticated or error occurred
      return;
    }

    const data = await response.json();
    const user = data.user;

    // Check if user is admin
    if (user && user.role === 'admin') {
      // Wait for the button to be available (since it's loaded via HTMX)
      const waitForButton = () => {
        const adminBtn = document.getElementById('goToAdmin');

        if (adminBtn) {
          // Button found! Show it and add click handler
          adminBtn.style.display = 'inline-block';

          // Add click handler to navigate to admin panel
          adminBtn.addEventListener('click', () => {
            window.location.href = '/admin.html';
          });
        } else {
          // Button not found yet, check again in 100ms
          setTimeout(waitForButton, 100);
        }
      };

      // Start waiting for the button
      waitForButton();
    }
  } catch (error) {
    // Silently fail if there's an error
    console.debug('Admin navigation check failed:', error);
  }
})();
