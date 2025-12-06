// auth.js - 인증 처리

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', function() {
  // 이미 로그인되어 있으면 대시보드로 이동
  const token = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (token) {
    validateAndRedirect();
  }

  // 로그인 폼 처리
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

// 로그인 처리
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // 유효성 검사
  if (!email || !password) {
    showAlert('Please enter both email and password', 'error');
    return;
  }

  // 버튼 비활성화 및 로딩 표시
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  
  loginBtn.disabled = true;
  btnText.textContent = 'Logging in...';
  btnSpinner.classList.remove('hidden');

  try {
    // API 호출
    const result = await API.login(email, password);

    if (result.success && result.data.success) {
      // 로그인 성공
      const userData = result.data;
      
      // 토큰과 사용자 정보 저장
      localStorage.setItem(CONFIG.STORAGE_KEY, userData.token);
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(userData.user));

      // 성공 메시지
      showAlert('Login successful! Redirecting...', 'success');

      // 대시보드로 이동
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);

    } else {
      // 로그인 실패
      showAlert(result.data.message || 'Invalid email or password', 'error');
      loginBtn.disabled = false;
      btnText.textContent = 'Login';
      btnSpinner.classList.add('hidden');
    }

  } catch (error) {
    console.error('Login error:', error);
    showAlert(error.message || 'Login failed. Please try again.', 'error');
    
    loginBtn.disabled = false;
    btnText.textContent = 'Login';
    btnSpinner.classList.add('hidden');
  }
}

// 세션 검증 및 리다이렉트
async function validateAndRedirect() {
  try {
    const result = await API.validateSession();
    
    if (result && result.success) {
      // 유효한 세션 - 대시보드로
      window.location.href = 'dashboard.html';
    } else {
      // 유효하지 않은 세션 - 로그아웃 처리
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      localStorage.removeItem(CONFIG.USER_KEY);
    }
  } catch (error) {
    console.error('Session validation error:', error);
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  }
}

// 알림 메시지 표시
function showAlert(message, type) {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;

  alertBox.textContent = message;
  alertBox.className = 'alert alert-' + type + ' show';

  // 3초 후 자동 숨김
  setTimeout(() => {
    alertBox.classList.remove('show');
  }, 3000);
}

// 현재 사용자 정보 가져오기
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

// 로그아웃
async function logout() {
  try {
    await API.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // 로컬 스토리지 클리어
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    
    // 로그인 페이지로 이동
    window.location.href = 'index.html';
  }
}

// 권한 체크
function checkPermission(requiredRole) {
  const user = getCurrentUser();
  if (!user) return false;

  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'staff': 1
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}
