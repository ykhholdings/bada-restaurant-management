// config.js - API Configuration

const CONFIG = {
  // Apps Script Deployment URL
  API_URL: 'https://script.google.com/macros/s/AKfycbyAFehhXsX8KQ7lHUZBeUAKju4h2TS7Kpl_UHOpsyiwp_X1LxMlZZyvjLEE3Y4_3Nct/exec',

  // Local Storage Keys
  STORAGE_KEY: 'bada_auth_token',
  USER_KEY: 'bada_user',

  // Branch Information
  BRANCHES: {
    'BR001': { name: 'BADA Restaurant', location: 'Al Barsha', coords: { lat: 25.0857, lng: 55.2094 } },
    'BR002': { name: 'Crazy Ramen', location: 'Al Ghurair', coords: { lat: 25.2697, lng: 55.3273 } },
    'BR003': { name: 'Crazy Ramen', location: 'Muraqqabat', coords: { lat: 25.2656, lng: 55.3220 } },
    'BR004': { name: 'Crazy Ramen', location: 'Burjuman', coords: { lat: 25.2529, lng: 55.3021 } }
  },

  // User Roles
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
  }
};
