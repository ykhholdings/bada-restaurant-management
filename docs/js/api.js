// api.js - API 통신 모듈

const API = {
  // API 호출 함수
  async call(action, data = {}) {
    try {
      const token = localStorage.getItem(CONFIG.STORAGE_KEY);
      
      const payload = {
        action: action,
        data: data,
        token: token
      };

      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      
      // 세션 만료 체크
      if (!result.success && result.message && 
          result.message.includes('Invalid or expired session')) {
        // 로그아웃 처리
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        window.location.href = 'index.html';
        return null;
      }

      return result;

    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to connect to server. Please check your connection.');
    }
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
