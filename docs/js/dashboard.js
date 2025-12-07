// dashboard.js - Dashboard Logic

let currentUser = null;

// Page Load
document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication
  const token = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // Load user info
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }

  // Update UI
  updateUserInfo();

  // Hide announcements for now
  document.querySelector('.announcement-section').style.display = 'none';

  // Update menu visibility based on role
  updateMenuVisibility();
});

// Update user info display
function updateUserInfo() {
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userRole').textContent = currentUser.role.toUpperCase();

  // Branch info
  const branch = CONFIG.BRANCHES[currentUser.branch];
  if (branch) {
    document.getElementById('userBranch').textContent =
      branch.name + ' - ' + branch.location;
  } else if (currentUser.branch === 'ALL') {
    document.getElementById('userBranch').textContent = 'All Branches';
  }
}

// Update menu visibility based on role
function updateMenuVisibility() {
  const role = currentUser.role;

  // Staff: limited access
  if (role === CONFIG.ROLES.STAFF) {
    // Hide sales card
    const salesCard = document.getElementById('salesCard');
    if (salesCard) salesCard.style.display = 'none';
  }

  // Manager: own branch only
  if (role === CONFIG.ROLES.MANAGER) {
    // All menus visible
  }

  // Admin: all access
  if (role === CONFIG.ROLES.ADMIN) {
    // All menus visible
  }
}

// Navigation functions
function goToPurchase() {
  window.location.href = 'purchase.html';
}

function goToSales() {
  if (currentUser.role === CONFIG.ROLES.STAFF) {
    alert('⛔ Access Denied\n\nYou do not have permission to access Sales module.');
    return;
  }
  alert('💰 Sales Module\n\nComing soon!\n\nYou will be able to:\n- Submit daily closing\n- View sales reports\n- Track revenue');
}

function goToAttendance() {
  alert('📅 Attendance Module\n\nComing soon!\n\nYou will be able to:\n- View attendance records\n- Check work history\n- Download reports');
}

function goToPayroll() {
  if (currentUser.role === CONFIG.ROLES.STAFF) {
    alert('💵 Payroll\n\nComing soon!\n\nYou will be able to view your salary information.');
    return;
  }
  alert('💵 Payroll Module\n\nComing soon!\n\nYou will be able to:\n- Manage salaries\n- Calculate payments\n- Generate payslips');
}

function handleCheckIn() {
  alert('✅ Check In\n\nComing soon!\n\nGPS-based attendance check-in will be available here.');
}

function handleCheckOut() {
  alert('🏁 Check Out\n\nComing soon!\n\nAttendance check-out will be available here.');
}

// Get current user from localStorage
function getCurrentUser() {
  const userJson = localStorage.getItem(CONFIG.USER_KEY);
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return null;
  }
}

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = 'index.html';
  }
}
