// api.js - API 통신 모듈 (JSONP 방식)

const API = {
  // API 호출 함수 (JSONP)
  async call(action, data = {}) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem(CONFIG.STORAGE_KEY);
      
      const payload = {
        action: action,
        data: data,
        token: token
      };

      // 콜백 함수 이름
      const callbackName = 'apiCallback_' + Date.now();
      
      // 전역 콜백 함수 생성
      window[callbackName] = function(result) {
        // 콜백 함수 제거
        delete window[callbackName];
        document.body.removeChild(script);
        
        // 세션 만료 체크
        if (!result.success && result.message && 
            result.message.includes('Invalid or expired session')) {
          localStorage.removeItem(CONFIG.STORAGE_KEY);
          localStorage.removeItem(CONFIG.USER_KEY);
          window.location.href = 'index.html';
          return;
        }
        
        resolve(result);
      };

      // JSONP 스크립트 태그 생성
      const script = document.createElement('script');
      const params = new URLSearchParams({
        action: action,
        data: JSON.stringify(data),
        token: token || '',
        callback: callbackName
      });
      
      script.src = CONFIG.API_URL + '?' + params.toString();
      script.onerror = function() {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('Failed to connect to server'));
      };
      
      document.body.appendChild(script);
    });
  },

  // 로그인
  async login(email, password) {
    return await this.call('auth.login', { email, password });
  },

  // 세션 검증
  async validateSession() {
    return await this.call('auth.validate');
  },

  // 로그아웃
  async logout() {
    return await this.call('auth.logout');
  },

  // 공지사항 목록
  async getAnnouncements() {
    return await this.call('announcement.list');
  },

  // 공지사항 생성
  async createAnnouncement(branchId, message) {
    return await this.call('announcement.create', { 
      branchId, 
      message 
    });
  },

  // 공지사항 수정
  async updateAnnouncement(id, message) {
    return await this.call('announcement.update', { 
      id, 
      message 
    });
  },

  // 공지사항 삭제
  async deleteAnnouncement(id) {
    return await this.call('announcement.update', { 
      id, 
      deactivate: true 
    });
  },

  // 출근
  async checkIn(employeeId, gpsLat, gpsLng) {
    return await this.call('attendance.checkin', {
      employeeId,
      gpsLat,
      gpsLng
    });
  },

  // 퇴근
  async checkOut(employeeId) {
    return await this.call('attendance.checkout', {
      employeeId
    });
  },

  // 출석 목록
  async getAttendance(employeeId, month, year) {
    return await this.call('attendance.list', {
      employeeId,
      month,
      year
    });
  },

  // 구매 업로드 (OCR)
  async uploadPurchase(imageBase64, approverId, branchId) {
    return await this.call('purchase.upload', {
      image_base64: imageBase64,
      approver_id: approverId,
      branch_id: branchId
    });
  },

  // 구매 목록
  async getPurchases(branchId, status, dateFrom, dateTo) {
    return await this.call('purchase.list', {
      branch_id: branchId,
      status: status,
      date_from: dateFrom,
      date_to: dateTo
    });
  },

  // 구매 승인/거부
  async approvePurchase(purchaseId, status, note) {
    return await this.call('purchase.approve', {
      purchase_id: purchaseId,
      status: status,
      note: note
    });
  }
};
