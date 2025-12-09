/**
 * jwt.js
 *
 * JWT token parsing utilities
 */

/**
 * JWT token'dan payload'u çıkar
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 */
export function parseJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format');
      return {};
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return {};
  }
}
