/**
 * Language Helper - Get language resourceId from code
 */

// Sample languages data - Update this with your actual languages endpoint data
const languages = {
  data: [
    { id: '2b1583d7-d76b-45ac-b5a5-fe58d00c70ff', code: 'en', isoCode: 'en-US', name: 'English' },
    { id: 'da5c3e9f-8c4a-4b2e-9d1f-7c8e5a6b9c2d', code: 'tr', isoCode: 'tr-TR', name: 'Turkish' },
    { id: '5f9e2c3a-1b4d-4e6f-8g9h-0i1j2k3l4m5n', code: 'de', isoCode: 'de-DE', name: 'German' },
    { id: '3a4b5c6d-7e8f-9g0h-1i2j-3k4l5m6n7o8p', code: 'fr', isoCode: 'fr-FR', name: 'French' },
    { id: '8q9r0s1t-2u3v-4w5x-6y7z-8a9b0c1d2e3f', code: 'es', isoCode: 'es-ES', name: 'Spanish' }
  ]
};

/**
 * Get language resourceId from language code
 *
 * @param {string} languageCode - Language code (en, tr, de, etc.) or UUID
 * @returns {string} - Language resourceId (UUID)
 */
export function getLanguageResourceId(languageCode) {
  try {
    if (!languageCode) {
      // Default fallback - English
      console.log('[getLanguageResourceId] No language code provided, using English default');
      return '2b1583d7-d76b-45ac-b5a5-fe58d00c70ff';
    }

    // First try: ID matching (if already a resolved UUID)
    const languageById = languages.data.find(
      (lang) => lang.id?.toLowerCase() === languageCode.toLowerCase()
    );

    if (languageById?.id) {
      console.log(`[getLanguageResourceId] Found language by ID: ${languageById.id}`);
      return languageById.id;
    }

    // Second try: Normalize code and match by code, isoCode, or name
    const normalizedCode = (languageCode || 'en').toLowerCase();

    const language = languages.data.find(
      (lang) =>
        lang.code?.toLowerCase() === normalizedCode ||
        lang.isoCode?.toLowerCase() === normalizedCode ||
        lang.name?.toLowerCase() === normalizedCode
    );

    if (language?.id) {
      console.log(`[getLanguageResourceId] Found language: ${language.name} (${language.code}) - ID: ${language.id}`);
      return language.id;
    }

    // Default fallback - English
    console.warn(`[getLanguageResourceId] Language code '${languageCode}' not found, using English default`);
    return '2b1583d7-d76b-45ac-b5a5-fe58d00c70ff';

  } catch (error) {
    console.error('[getLanguageResourceId] Error:', error.message);
    return '2b1583d7-d76b-45ac-b5a5-fe58d00c70ff';
  }
}
