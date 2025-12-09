import { categoryItems, difficultyItems } from '../utils/constants.js';
import { getLanguageResourceId } from '../utils/languageHelper.js';

/**
 * Create phishing email template
 *
 * @param {Object} params
 * @param {string} params.accessToken - JWT authentication token
 * @param {string} params.companyId - Company resource ID
 * @param {string} params.url - API base URL
 * @param {Object} params.templateData - Email template data
 * @returns {Promise<Object>} - Created template details
 */
export async function submitPhishingEmailTemplate({ accessToken, companyId, url, templateData }) {
  try {
    console.log('[submitPhishingEmailTemplate] Starting email template creation');
    console.log('[submitPhishingEmailTemplate] Template name:', templateData.name);

    // Step 1: Find category resourceId by name
    const category = categoryItems.find(cat => cat.text === templateData.method);
    if (!category) {
      throw new Error(`Category not found: ${templateData.method}`);
    }
    console.log('[submitPhishingEmailTemplate] Category resourceId found:', category.value);

    // Step 1b: Find difficulty resourceId by name
    const difficulty = difficultyItems.find(diff => diff.name === templateData.difficulty);
    if (!difficulty) {
      throw new Error(`Difficulty not found: ${templateData.difficulty}`);
    }
    console.log('[submitPhishingEmailTemplate] Difficulty resourceId found:', difficulty.resourceId);

    // Step 2: Get language resourceId
    const languageResourceId = getLanguageResourceId(templateData.language);
    console.log('[submitPhishingEmailTemplate] Language resourceId:', languageResourceId);

    // Step 3: Create FormData
    const formData = new FormData();
    formData.append('name', templateData.name || '');
    formData.append('description', templateData.description || '');
    formData.append('languageTypeResourceId', languageResourceId);
    formData.append('categoryResourceId', category.value);
    formData.append('difficultyResourceId', difficulty.resourceId);
    formData.append('isAssistedByAI', true);
    formData.append('isPlainText', false);
    formData.append('availableForRequests[0][Type]', 'MyCompanyOnly');
    formData.append('availableForRequests[0][ResourceId]', null);
    
    // Step 4: Add email-specific fields if provided
    if (templateData.email) {
      const email = templateData.email;
      formData.append('fromAddress', email.fromAddress || '');
      formData.append('fromName', email.fromName || '');
      formData.append('subject', email.subject || '');
      formData.append('template', email.template || '');
      console.log('[submitPhishingEmailTemplate] Email fields added');
    }

    console.log('[submitPhishingEmailTemplate] FormData prepared');
    console.log('[submitPhishingEmailTemplate] Form entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, typeof value === 'string' ? value.substring(0, 100) : value);
    }

    // Step 5: Send to API
    const response = await fetch(`${url}/api/phishing-simulator/email-templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-IR-API-KEY': 'apikey',
        'X-IR-COMPANY-ID': companyId
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API error: ${response.status} - ${errorData.message || 'Unknown error'}`
      );
    }

    const result = await response.json();

    console.log('[submitPhishingEmailTemplate] Email template created successfully');

    // Extract from nested data structure
    const emailTemplateData = result.data?.searchPsEmailTemplate || result.searchPsEmailTemplate || result;
    const resourceId = result.data?.resourceId || result.resourceId;
    const id = emailTemplateData?.id;

    console.log('[submitPhishingEmailTemplate] Template ResourceId:', resourceId);
    console.log('[submitPhishingEmailTemplate] Template ID:', id);

    return {
      success: true,
      resourceId: resourceId,
      id: id,
      name: emailTemplateData?.name || result.name,
      description: emailTemplateData?.description || '',
      message: 'Email template successfully created'
    };

  } catch (error) {
    console.error('[submitPhishingEmailTemplate] Error:', error.message);
    throw new Error(`Failed to create email template: ${error.message}`);
  }
}
