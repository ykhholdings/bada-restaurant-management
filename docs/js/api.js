// api.js - API 통신 모듈

const API = {
  // API 호출 함수 (JSONP 방식)
  async call(action, data = {}) {
    try {
      const token = localStorage.getItem(CONFIG.STORAGE_KEY);

      const payload = {
        action: action,
        data: data,
        token: token
      };

      // JSONP 방식으로 호출
      const result = await this._jsonpRequest(payload);

      // 세션 만료 체크
      if (!result.ok && result.error &&
          result.error.includes('Invalid or expired session')) {
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

  // JSONP 요청 헬퍼
  _jsonpRequest(payload) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.random().toString(36).substr(2, 9);
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Request timeout'));
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        delete window[callbackName];
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      window[callbackName] = (response) => {
        cleanup();
        resolve(response);
      };

      const script = document.createElement('script');
      const url = CONFIG.API_URL +
                  '?callback=' + encodeURIComponent(callbackName) +
                  '&payload=' + encodeURIComponent(JSON.stringify(payload));

      script.src = url;
      script.onerror = () => {
        cleanup();
        reject(new Error('Script load error'));
      };

      document.head.appendChild(script);
    });
  },

  async login(email, password) {
    return await this.call('auth.login', { email, password });
  },

  async validateSession() {
    return await this.call('auth.validate');
  },

  async logout() {
    return await this.call('auth.logout');
  },

  async getAnnouncements() {
    return await this.call('announcement.list');
  },

  async createAnnouncement(branchId, message) {
    return await this.call('announcement.create', { branchId, message });
  },

  async updateAnnouncement(id, message) {
    return await this.call('announcement.update', { id, message });
  },

  async deleteAnnouncement(id) {
    return await this.call('announcement.update', { id, deactivate: true });
  },

  async checkIn(employeeId, gpsLat, gpsLng) {
    return await this.call('attendance.checkin', { employeeId, gpsLat, gpsLng });
  },

  async checkOut(employeeId) {
    return await this.call('attendance.checkout', { employeeId });
  },

  async getAttendance(employeeId, month, year) {
    return await this.call('attendance.list', { employeeId, month, year });
  },

  async uploadPurchase(imageBase64, approverId, branchId) {
    // Use POST for large payloads (images)
    const token = localStorage.getItem(CONFIG.STORAGE_KEY);

    const payload = {
      action: 'purchase.upload',
      data: {
        image_base64: imageBase64,
        approver_id: approverId,
        branch_id: branchId
      },
      token: token
    };

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      // Check for session expiry
      if (!result.ok && result.error && result.error.includes('Invalid or expired session')) {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        window.location.href = 'index.html';
        return null;
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload. Please try again.');
    }
  },

  async getPurchases(branchId, status, dateFrom, dateTo) {
    return await this.call('purchase.list', { branch_id: branchId, status, date_from: dateFrom, date_to: dateTo });
  },

  async approvePurchase(purchaseId, status, note) {
    return await this.call('purchase.approve', { purchase_id: purchaseId, status, note });
  }
};
