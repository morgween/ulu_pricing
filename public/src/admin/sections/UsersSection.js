export class UsersSection {
  constructor(documentRef) {
    this.document = documentRef;
    this.users = [];
  }

  $(id) {
    return this.document.getElementById(id);
  }

  async initialize() {
    this.bindModalControls();
    this.bindAddUserButton();
    await this.loadUsers();
  }

  bindAddUserButton() {
    const addBtn = this.$('addUserBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAddUserModal());
    }
  }

  bindModalControls() {
    const modal = this.$('userModal');
    const closeBtn = this.$('closeUserModal');
    const cancelBtn = this.$('cancelUserBtn');
    const form = this.$('userForm');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    // Close modal when clicking outside
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }

    // Handle form submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUser();
      });
    }
  }

  openAddUserModal() {
    this.$('userModalTitle').textContent = 'הוסף משתמש חדש';
    this.$('userId').value = '';
    this.$('userFullName').value = '';
    this.$('userEmail').value = '';
    this.$('userRole').value = 'user';
    this.$('userPassword').value = '';
    this.$('sendEmail').checked = true;
    this.$('passwordGroup').style.display = 'block';
    this.$('userModal').style.display = 'flex';
  }

  openEditUserModal(user) {
    this.$('userModalTitle').textContent = 'ערוך משתמש';
    this.$('userId').value = user.id;
    this.$('userFullName').value = user.fullName;
    this.$('userEmail').value = user.email;
    this.$('userRole').value = user.role;
    this.$('passwordGroup').style.display = 'none'; // Don't allow password change in edit
    this.$('userModal').style.display = 'flex';
  }

  closeModal() {
    this.$('userModal').style.display = 'none';
    this.$('userForm').reset();
  }

  async loadUsers() {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      this.users = await response.json();
      this.renderUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('שגיאה בטעינת המשתמשים');
    }
  }

  renderUsers() {
    const tbody = this.$('tblUsers')?.querySelector('tbody');
    if (!tbody) return;

    if (this.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">אין משתמשים במערכת</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    this.users.forEach(user => {
      const tr = this.document.createElement('tr');

      // Full Name
      const tdName = this.document.createElement('td');
      tdName.textContent = user.fullName;
      tr.appendChild(tdName);

      // Email
      const tdEmail = this.document.createElement('td');
      tdEmail.textContent = user.email;
      tr.appendChild(tdEmail);

      // Role
      const tdRole = this.document.createElement('td');
      const roleBadge = this.document.createElement('span');
      roleBadge.className = `role-badge ${user.role}`;
      roleBadge.textContent = user.role === 'admin' ? 'מנהל' : 'משתמש';
      tdRole.appendChild(roleBadge);
      tr.appendChild(tdRole);

      // Status
      const tdStatus = this.document.createElement('td');
      const statusBadge = this.document.createElement('span');
      statusBadge.className = `status-badge ${user.isActive ? 'active' : 'inactive'}`;
      statusBadge.textContent = user.isActive ? 'פעיל' : 'לא פעיל';
      tdStatus.appendChild(statusBadge);
      tr.appendChild(tdStatus);

      // Last Login
      const tdLastLogin = this.document.createElement('td');
      tdLastLogin.textContent = user.lastLogin
        ? new Date(user.lastLogin).toLocaleString('he-IL')
        : 'מעולם לא התחבר';
      tr.appendChild(tdLastLogin);

      // Created At
      const tdCreated = this.document.createElement('td');
      tdCreated.textContent = new Date(user.createdAt).toLocaleDateString('he-IL');
      tr.appendChild(tdCreated);

      // Actions
      const tdActions = this.document.createElement('td');
      tdActions.className = 'table-actions';

      const editBtn = this.document.createElement('button');
      editBtn.className = 'button btn';
      editBtn.textContent = 'ערוך';
      editBtn.onclick = () => this.openEditUserModal(user);
      tdActions.appendChild(editBtn);

      // Reset Password button
      const resetPasswordBtn = this.document.createElement('button');
      resetPasswordBtn.className = 'button btn';
      resetPasswordBtn.textContent = 'אפס סיסמה';
      resetPasswordBtn.style.background = '#ff9800';
      resetPasswordBtn.style.color = 'white';
      resetPasswordBtn.onclick = () => this.resetPassword(user.id);
      tdActions.appendChild(resetPasswordBtn);

      if (user.isActive) {
        const deactivateBtn = this.document.createElement('button');
        deactivateBtn.className = 'button btn';
        deactivateBtn.textContent = 'השבת';
        deactivateBtn.style.background = '#f44336';
        deactivateBtn.style.color = 'white';
        deactivateBtn.onclick = () => this.toggleUserStatus(user.id, false);
        tdActions.appendChild(deactivateBtn);
      } else {
        const activateBtn = this.document.createElement('button');
        activateBtn.className = 'button btn';
        activateBtn.textContent = 'הפעל';
        activateBtn.style.background = '#4caf50';
        activateBtn.style.color = 'white';
        activateBtn.onclick = () => this.toggleUserStatus(user.id, true);
        tdActions.appendChild(activateBtn);
      }

      // Delete button
      const deleteBtn = this.document.createElement('button');
      deleteBtn.className = 'button btn';
      deleteBtn.textContent = 'מחק';
      deleteBtn.style.background = '#d32f2f';
      deleteBtn.style.color = 'white';
      deleteBtn.onclick = () => this.deleteUser(user.id);
      tdActions.appendChild(deleteBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async saveUser() {
    const userId = this.$('userId').value;
    const isEdit = !!userId;

    const userData = {
      fullName: this.$('userFullName').value,
      email: this.$('userEmail').value,
      role: this.$('userRole').value
    };

    // Add password and sendEmail only for new users
    if (!isEdit) {
      userData.password = this.$('userPassword').value || undefined;
      userData.sendEmail = this.$('sendEmail').checked;
    }

    try {
      const url = isEdit ? `/api/users/${userId}` : '/api/users';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save user');
      }

      this.closeModal();
      await this.loadUsers();

      if (!isEdit && data.generatedPassword) {
        this.alert(`משתמש נוצר בהצלחה!\n\nסיסמה שנוצרה: ${data.generatedPassword}\n\n${data.emailSent ? 'אימייל עם פרטי התחברות נשלח למשתמש.' : 'לא ניתן לשלוח אימייל. אנא העתק את הסיסמה ושלח למשתמש באופן ידני.'}`);
      } else {
        this.alert(isEdit ? 'משתמש עודכן בהצלחה' : 'משתמש נוצר בהצלחה');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      this.showError(error.message || 'שגיאה בשמירת המשתמש');
    }
  }

  async toggleUserStatus(userId, activate) {
    if (!confirm(`האם אתה בטוח שברצונך ${activate ? 'להפעיל' : 'להשבית'} את המשתמש?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: activate })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      await this.loadUsers();
      this.alert(`המשתמש ${activate ? 'הופעל' : 'הושבת'} בהצלחה`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      this.showError('שגיאה בעדכון סטטוס המשתמש');
    }
  }

  async resetPassword(userId) {
    if (!confirm('האם אתה בטוח שברצונך לאפס את סיסמת המשתמש? סיסמה חדשה תישלח למייל המשתמש.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reset password');
      }

      const data = await response.json();

      // Show password if email failed
      if (!data.emailSent && data.temporaryPassword) {
        this.alert(`הסיסמה אופסה בהצלחה!\n\nסיסמה זמנית: ${data.temporaryPassword}\n\nאזהרה: שמור את הסיסמה הזו באופן מאובטח. היא לא תוצג שוב.\n\nשליחת המייל נכשלה - אנא העבר את הסיסמה למשתמש באופן ידני.`);
      } else {
        this.alert('הסיסמה אופסה בהצלחה. המשתמש יקבל סיסמה חדשה במייל.');
      }

      await this.loadUsers();
    } catch (error) {
      console.error('Error resetting password:', error);
      this.showError(error.message || 'שגיאה באיפוס סיסמה');
    }
  }

  async deleteUser(userId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשתמש?\n\nפעולה זו לא ניתנת לביטול!')) {
      return;
    }

    // Double confirmation for extra safety
    if (!confirm('אישור סופי: האם אתה בטוח לחלוטין שברצונך למחוק את המשתמש? כל הנתונים שלו יימחקו לצמיתות.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user');
      }

      await this.loadUsers();
      this.alert('המשתמש נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting user:', error);
      this.showError(error.message || 'שגיאה במחיקת המשתמש');
    }
  }

  alert(message) {
    const view = this.document.defaultView;
    if (view && typeof view.alert === 'function') {
      view.alert(message);
    }
  }

  showError(message) {
    this.alert(`שגיאה: ${message}`);
  }
}
