// config.js - API 설정

const CONFIG = {
  // Apps Script 배포 URL
  API_URL: 'https://script.google.com/macros/s/AKfycbzhMIQaYqXJpdSWDVnur24gcgn_FRzp4SSCYHmMzobdD2DsJq5KXvqYMY7jwBkZ8x2-hg/exec',
  
  // 로컬 스토리지 키
  STORAGE_KEY: 'bada_auth_token',
  USER_KEY: 'bada_user',
  
  // 지점 정보
  BRANCHES: {
    'BR001': { name: 'BADA Restaurant', location: 'Al Barsha', coords: { lat: 25.0857, lng: 55.2094 } },
    'BR002': { name: 'Crazy Ramen', location: 'Al Ghurair', coords: { lat: 25.2697, lng: 55.3273 } },
    'BR003': { name: 'Crazy Ramen', location: 'Muraqqabat', coords: { lat: 25.2656, lng: 55.3220 } },
    'BR004': { name: 'Crazy Ramen', location: 'Burjuman', coords: { lat: 25.2529, lng: 55.3021 } }
  },
  
  // 역할
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
  }
};
