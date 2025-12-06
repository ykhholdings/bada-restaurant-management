// dashboard.js - 대시보드 로직

let currentUser = null;

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', async function() {
  // 로그인 체크
  const token = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 사용자 정보 로드
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }

  // UI 업데이트
  updateUserInfo();

  // 공지사항 로드
  await loadAnnouncements();

  // 권한에 따른 메뉴 표시/숨김
  updateMenuVisibility();
});

// 사용자 정보 표시
function updateUserInfo() {
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
  
  // 지점 정보
  const branch = CONFIG.BRANCHES[currentUser.branch];
  if (branch) {
    document.getElementById('userBranch').textContent = 
      branch.name + ' - ' + branch.location;
  } else if (currentUser.branch === 'ALL') {
    document.getElementById('userBranch').textContent = 'All Branches';
  }
}

// 공지사항 로드
async function loadAnnouncements() {
  const listElement = document.getElementById('announcementList');
  
  try {
    const result = await API.getAnnouncements();
    
    if (result && result.success && result.data.announcements) {
      const announcements = result.data.announcements;
      
      if (announcements.length === 0) {
        listElement.innerHTML = '<div class="no-announcements">No announcements at this time</div>';
        return;
      }

      // 공지사항 HTML 생성
      listElement.innerHTML = announcements.map(announcement => `
        <div class="announcement-item">
          <div class="announcement-header">
            <span class="announcement-branch">${announcement.branchName}</span>
            <span class="announcement-date">${announcement.created}</span>
          </div>
          <div class="announcement-message">${escapeHtml(announcement.message)}</div>
        </div>
      `).join('');

    } else {
      listElement.innerHTML = '<div class="no-announcements">Failed to load announcements</div>';
    }

  } catch (error) {
    console.error('Load announcements error:', error);
    listElement.innerHTML = '<div class="no-announcements">Error loading announcements</div>';
  }
}

// 권한에 따른 메뉴 표시
function updateMenuVisibility() {
  const role = currentUser.role;

  // Staff는 구매 업로드, 출퇴근만 가능
  if (role === CONFIG.ROLES.STAFF) {
    // 매출, 급여 카드 숨김
    const salesCard = document.getElementById('salesCard');
    const payrollCard = document.getElementById('payrollCard');
    
    if (salesCard) salesCard.style.display = 'none';
    if (payrollCard) {
      payrollCard.onclick = function() {
        alert('You can only view your own payroll information');
      };
    }
  }

  // Manager는 자기 지점만
  if (role === CONFIG.ROLES.MANAGER) {
    // 모든 메뉴 표시
  }

  // Admin은 모두 가능
  if (role === CONFIG.ROLES.ADMIN) {
    // 모든 메뉴
