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
    // 모든 메뉴 표시
  }
}

// 출근 처리
async function handleCheckIn() {
  if (!currentUser) return;

  // GPS 위치 가져오기
  if (!navigator.geolocation) {
    alert('Your browser does not support GPS location');
    return;
  }

  const checkInBtn = document.getElementById('checkinCard');
  checkInBtn.style.opacity = '0.6';
  checkInBtn.style.pointerEvents = 'none';

  try {
    // GPS 위치 요청
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // API 호출
        const result = await API.checkIn(currentUser.id, lat, lng);

        if (result && result.success) {
          alert('✅ ' + result.data.message);
          await loadAnnouncements(); // 공지사항 새로고침
        } else {
          alert('❌ ' + (result.message || 'Check-in failed'));
        }

        checkInBtn.style.opacity = '1';
        checkInBtn.style.pointerEvents = 'auto';
      },
      (error) => {
        console.error('GPS Error:', error);
        alert('Failed to get GPS location. Please enable location services.');
        checkInBtn.style.opacity = '1';
        checkInBtn.style.pointerEvents = 'auto';
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

  } catch (error) {
    console.error('Check-in error:', error);
    alert('Check-in failed: ' + error.message);
    checkInBtn.style.opacity = '1';
    checkInBtn.style.pointerEvents = 'auto';
  }
}

// 퇴근 처리
async function handleCheckOut() {
  if (!currentUser) return;

  if (!confirm('Are you sure you want to check out?')) {
    return;
  }

  const checkOutBtn = document.getElementById('checkoutCard');
  checkOutBtn.style.opacity = '0.6';
  checkOutBtn.style.pointerEvents = 'none';

  try {
    const result = await API.checkOut(currentUser.id);

    if (result && result.success) {
      alert('✅ ' + result.data.message + '\nTotal hours: ' + result.data.totalHours);
    } else {
      alert('❌ ' + (result.message || 'Check-out failed'));
    }

  } catch (error) {
    console.error('Check-out error:', error);
    alert('Check-out failed: ' + error.message);
  } finally {
    checkOutBtn.style.opacity = '1';
    checkOutBtn.style.pointerEvents = 'auto';
  }
}

// 페이지 이동 함수들
function goToPurchase() {
  alert('Purchase module - Coming soon!\nYou will be able to upload receipts here.');
}

function goToSales() {
  if (currentUser.role === CONFIG.ROLES.STAFF) {
    alert('You do not have permission to access Sales module');
    return;
  }
  alert('Sales module - Coming soon!\nYou will be able to submit daily closing reports here.');
}

function goToAttendance() {
  alert('Attendance module - Coming soon!\nYou will be able to view attendance records here.');
}

function goToPayroll() {
  if (currentUser.role === CONFIG.ROLES.STAFF) {
    alert('Payroll module - Coming soon!\nYou will be able to view your salary information here.');
    return;
  }
  alert('Payroll module - Coming soon!\nYou will be able to manage employee salaries here.');
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 새로고침 함수
async function refreshDashboard() {
  await loadAnnouncements();
  alert('Dashboard refreshed!');
}
```

4. **"Commit new file" 클릭**

---

## 🎉 **축하해! Frontend 완성!**

### ✅ 완료된 파일 목록:
```
docs/
├── index.html          ✅
├── dashboard.html      ✅
├── css/
│   └── style.css      ✅
└── js/
    ├── config.js      ✅
    ├── api.js         ✅
    ├── auth.js        ✅
    └── dashboard.js   ✅
