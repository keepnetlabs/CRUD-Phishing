/**
 * Language Helper - Get language resourceId from code
 */

import languages from '../languages.js';

/**
 * Get language resourceId from language code
 *
 * @param {string} languageCode - Language code (en, tr, fr, etc.) or isoCode (en-GB, tr-TR, etc.)
 * @returns {string} - Language resourceId
 */
export function getLanguageResourceId(languageCode) {
  try {
    // Debug: Check if languages array is loaded
    console.log(`[getLanguageResourceId] Languages array length: ${languages?.length || 0}`);
    console.log(`[getLanguageResourceId] Input languageCode: '${languageCode}' (type: ${typeof languageCode})`);

    if (!languageCode) {
      // Default fallback - English
      const defaultLang = languages.find(lang => lang.isoCode === 'en-GB');
      const defaultResourceId = defaultLang?.resourceId || '862249c19aad';
      console.log('[getLanguageResourceId] No language code provided, using English default');
      return defaultResourceId;
    }

    // Normalize code to lowercase
    const normalizedCode = languageCode.toLowerCase().trim();
    console.log(`[getLanguageResourceId] Normalized code: '${normalizedCode}'`);

    // Try to find by resourceId first (if already resolved)
    const languageByResourceId = languages.find(
      (lang) => lang.resourceId?.toLowerCase() === normalizedCode
    );

    if (languageByResourceId?.resourceId) {
      console.log(`[getLanguageResourceId] Found language by resourceId: ${languageByResourceId.resourceId}`);
      return languageByResourceId.resourceId;
    }

    // Try to find by isoCode (en-GB, tr-TR, etc.)
    console.log(`[getLanguageResourceId] Searching by isoCode for: '${normalizedCode}'`);
    const languageByIsoCode = languages.find(
      (lang) => {
        const langIsoCode = lang.isoCode?.toLowerCase();
        const matches = langIsoCode === normalizedCode;
        if (langIsoCode && langIsoCode.includes('en')) {
          console.log(`[getLanguageResourceId] Checking isoCode: '${lang.isoCode}' (normalized: '${langIsoCode}') vs '${normalizedCode}' = ${matches}`);
        }
        return matches;
      }
    );

    if (languageByIsoCode?.resourceId) {
      console.log(`[getLanguageResourceId] ✓ Found language by isoCode: ${languageByIsoCode.name} (${languageByIsoCode.isoCode}) - resourceId: ${languageByIsoCode.resourceId}`);
      return languageByIsoCode.resourceId;
    } else {
      console.log(`[getLanguageResourceId] ✗ No match found by isoCode for '${normalizedCode}'`);
    }

    // Try to find by description/code (EN, TR, FR, etc.)
    console.log(`[getLanguageResourceId] Searching by description/code for: '${normalizedCode}'`);
    const languageByCode = languages.find(
      (lang) => lang.description?.toLowerCase() === normalizedCode || lang.code?.toLowerCase() === normalizedCode
    );

    if (languageByCode?.resourceId) {
      console.log(`[getLanguageResourceId] ✓ Found language by code: ${languageByCode.name} - resourceId: ${languageByCode.resourceId}`);
      return languageByCode.resourceId;
    } else {
      console.log(`[getLanguageResourceId] ✗ No match found by description/code for '${normalizedCode}'`);
    }

    // Try to find by name (English, Turkish, etc.)
    console.log(`[getLanguageResourceId] Searching by name for: '${normalizedCode}'`);
    const languageByName = languages.find(
      (lang) => lang.name?.toLowerCase() === normalizedCode
    );

    if (languageByName?.resourceId) {
      console.log(`[getLanguageResourceId] ✓ Found language by name: ${languageByName.name} - resourceId: ${languageByName.resourceId}`);
      return languageByName.resourceId;
    } else {
      console.log(`[getLanguageResourceId] ✗ No match found by name for '${normalizedCode}'`);
    }

    // Debug: Show sample isoCode values for troubleshooting
    const sampleIsoCodes = languages
      .filter(lang => lang.isoCode)
      .slice(0, 5)
      .map(lang => `${lang.name} (${lang.isoCode})`)
      .join(', ');
    console.log(`[getLanguageResourceId] Sample available isoCodes: ${sampleIsoCodes}...`);

    // Default fallback - English
    const defaultLang = languages.find(lang => lang.isoCode === 'en-GB');
    const defaultResourceId = defaultLang?.resourceId || '862249c19aad';
    console.warn(`[getLanguageResourceId] ⚠ Language code '${languageCode}' (normalized: '${normalizedCode}') not found after all search attempts, using English default (resourceId: ${defaultResourceId})`);
    return defaultResourceId;

  } catch (error) {
    console.error('[getLanguageResourceId] Error:', error.message);
    return '862249c19aad';
  }
}
