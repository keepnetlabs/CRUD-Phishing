/**
 * JWT Helper - Parse and extract token payload
 */

/**
 * Parse JWT token and extract payload
 *
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
export function parseJWT(token) {
  try {
    if (!token) {
      console.warn('[parseJWT] No token provided');
      return {};
    }

    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[parseJWT] Invalid token format');
      return {};
    }

    // Decode payload (second part)
    const payload = parts[1];
    const decoded = atob(payload);
    const tokenPayload = JSON.parse(decoded);

    console.log('[parseJWT] Token parsed successfully');
    return tokenPayload;

  } catch (error) {
    console.error('[parseJWT] Error parsing token:', error.message);
    return {};
  }
}

/**
 * Extract company ID from token payload
 *
 * @param {Object} tokenPayload - Decoded token payload
 * @returns {string} - Company resource ID
 */
export function getCompanyIdFromToken(tokenPayload) {
  return tokenPayload?.user_company_resourceid ||
         tokenPayload?.companyId ||
         tokenPayload?.company_id ||
         '';
}
