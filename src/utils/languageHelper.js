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
    if (!languageCode) {
      // Default fallback - English
      const defaultLang = languages.find(lang => lang.isoCode === 'en-GB');
      const defaultResourceId = defaultLang?.resourceId || '862249c19aad';
      console.log('[getLanguageResourceId] No language code provided, using English default');
      return defaultResourceId;
    }

    // Normalize code to lowercase
    const normalizedCode = languageCode.toLowerCase();

    // Try to find by resourceId first (if already resolved)
    const languageByResourceId = languages.find(
      (lang) => lang.resourceId?.toLowerCase() === normalizedCode
    );

    if (languageByResourceId?.resourceId) {
      console.log(`[getLanguageResourceId] Found language by resourceId: ${languageByResourceId.resourceId}`);
      return languageByResourceId.resourceId;
    }

    // Try to find by isoCode (en-GB, tr-TR, etc.)
    const languageByIsoCode = languages.find(
      (lang) => lang.isoCode?.toLowerCase() === normalizedCode
    );

    if (languageByIsoCode?.resourceId) {
      console.log(`[getLanguageResourceId] Found language by isoCode: ${languageByIsoCode.name} (${languageByIsoCode.isoCode}) - resourceId: ${languageByIsoCode.resourceId}`);
      return languageByIsoCode.resourceId;
    }

    // Try to find by description/code (EN, TR, FR, etc.)
    const languageByCode = languages.find(
      (lang) => lang.description?.toLowerCase() === normalizedCode || lang.code?.toLowerCase() === normalizedCode
    );

    if (languageByCode?.resourceId) {
      console.log(`[getLanguageResourceId] Found language by code: ${languageByCode.name} - resourceId: ${languageByCode.resourceId}`);
      return languageByCode.resourceId;
    }

    // Try to find by name (English, Turkish, etc.)
    const languageByName = languages.find(
      (lang) => lang.name?.toLowerCase() === normalizedCode
    );

    if (languageByName?.resourceId) {
      console.log(`[getLanguageResourceId] Found language by name: ${languageByName.name} - resourceId: ${languageByName.resourceId}`);
      return languageByName.resourceId;
    }

    // Default fallback - English
    const defaultLang = languages.find(lang => lang.isoCode === 'en-GB');
    const defaultResourceId = defaultLang?.resourceId || '862249c19aad';
    console.warn(`[getLanguageResourceId] Language code '${languageCode}' not found, using English default`);
    return defaultResourceId;

  } catch (error) {
    console.error('[getLanguageResourceId] Error:', error.message);
    return '862249c19aad';
  }
}
