import { BaseSection } from './BaseSection.js';

export class ImportExportSection extends BaseSection {
  constructor(documentRef, store, schedulePersist, flushPersist, renderAll, quotaTable) {
    super(documentRef, store, schedulePersist);
    this.flushPersist = flushPersist;
    this.renderAll = renderAll;
    this.quotaTable = quotaTable;
  }

  initialize() {
    this.bindSaveButton();
    this.bindLogoutButton();
    this.bindGoToCalculatorButton();
  }

  /**
   * Bind the main "שמור" (Save) button
   * Saves configuration to server
   */
  bindSaveButton() {
    const saveBtn = this.$('saveToServer');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        try {
          // Show saving state
          saveBtn.disabled = true;
          saveBtn.textContent = 'שומר...';

          // Flush all pending changes to server
          await this.flushPersist();

          // Success feedback
          saveBtn.textContent = '✓ נשמר';
          setTimeout(() => {
            saveBtn.textContent = 'שמור';
            saveBtn.disabled = false;
          }, 2000);

          this.alert('ההגדרות נשמרו בהצלחה לשרת!\nהשינויים זמינים לכל המשתמשים.');
        } catch (error) {
          console.error('Error saving configuration:', error);
          saveBtn.textContent = 'שגיאה';
          setTimeout(() => {
            saveBtn.textContent = 'שמור';
            saveBtn.disabled = false;
          }, 2000);
          this.alert('שגיאה בשמירת ההגדרות לשרת.\nאנא בדוק את החיבור ונסה שוב.');
        }
      });
    }
  }

  /**
   * Bind logout button
   */
  bindLogoutButton() {
    const logoutBtn = this.$('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (!confirm('האם אתה בטוח שברצונך להתנתק מהמערכת?')) {
          return;
        }

        try {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });

          if (response.ok) {
            // Redirect to login page
            window.location.href = '/login.html';
          } else {
            this.alert('שגיאה בהתנתקות. אנא נסה שוב.');
          }
        } catch (error) {
          console.error('Logout error:', error);
          this.alert('שגיאת תקשורת. אנא נסה שוב.');
        }
      });
    }
  }

  /**
   * Bind go to calculator button
   */
  bindGoToCalculatorButton() {
    const goToCalculatorBtn = this.$('goToCalculator');
    if (goToCalculatorBtn) {
      goToCalculatorBtn.addEventListener('click', () => {
        // Navigate to calculator
        window.location.href = '/';
      });
    }
  }

  alert(message) {
    const view = this.document.defaultView;
    if (view && typeof view.alert === 'function') {
      view.alert(message);
    }
  }
}
