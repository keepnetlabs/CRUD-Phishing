import { submitPhishingEmailTemplate } from './submitPhishingEmailTemplate.js';
import { submitPhishingLandingPage } from './submitPhishingLandingPage.js';
import { submitPhishingScenario } from './submitPhishingScenario.js';
import { parseJWT, getCompanyIdFromToken } from '../utils/jwtHelper.js';
import { methodTypeItems } from '../utils/constants.js';

/**
 * Submit phishing campaign - Main orchestrator
 *
 * @param {Object} params
 * @param {string} params.accessToken - JWT authentication token
 * @param {string} params.url - API base URL
 * @param {string} params.baseUrl - Frontend base URL
 * @param {Object} params.phishingData - Phishing campaign data
 * @returns {Promise<Object>} - Campaign details
 */
export async function submitPhishing({ accessToken, url, baseUrl, phishingData, companyId: bodyCompanyId }) {
  try {
    console.log('[submitPhishing] Starting phishing campaign submission');
    console.log('[submitPhishing] Campaign name:', phishingData.name);

    // Parse JWT token and extract company ID
    const tokenPayload = parseJWT(accessToken);
    console.log('[submitPhishing] Token payload:', JSON.stringify(tokenPayload, null, 2));

    const companyId = bodyCompanyId || phishingData?.companyId || getCompanyIdFromToken(tokenPayload);
    console.log('[submitPhishing] Company ID:', companyId);

    if (!companyId) {
      throw new Error('Unable to extract company ID from token');
    }

    // Determine API prefix based on isQuishing flag
    const isQuishing = phishingData.isQuishing || false;
    const apiPrefix = isQuishing ? 'quishing-simulator' : 'phishing-simulator';
    console.log('[submitPhishing] Using API prefix:', apiPrefix, '(isQuishing:', isQuishing + ')');

    // Submit email template
    const templateResult = await submitPhishingEmailTemplate({
      accessToken,
      companyId,
      url,
      templateData: phishingData,
      apiPrefix
    });
    console.log('[submitPhishing] Email template created:', {
      resourceId: templateResult.resourceId,
      id: templateResult.id
    });

    // Submit landing page
    let landingPageResult = null;
    if (phishingData.landingPage) {
      // Map pages with order based on position
      const landingPageData = {
        ...phishingData.landingPage,
        pages: (phishingData.landingPage.pages || []).map((page, index) => ({
          ...page,
          order: index + 1
        }))
      };

      landingPageResult = await submitPhishingLandingPage({
        accessToken,
        companyId,
        url,
        landingPageData,
        apiPrefix
      });
      console.log('[submitPhishing] Landing page created:', {
        resourceId: landingPageResult.resourceId,
        id: landingPageResult.id
      });
    }

    // Create scenario combining template and landing page
    let scenarioResult = null;
    if (templateResult && landingPageResult) {
      // Get methodTypeId from landing page method
      const normalizedMethod = phishingData.landingPage?.method?.replace(/-/g, ' ') || '';
      const methodType = methodTypeItems.find(m => m.text === normalizedMethod);
      const methodTypeId = methodType?.value || '1';

      scenarioResult = await submitPhishingScenario({
        accessToken,
        companyId,
        url,
        templateId: templateResult.id,
        landingPageId: landingPageResult.id,
        scenarioData: {
          templateName: templateResult.name,
          templateDescription: templateResult.description,
          methodTypeId: methodTypeId
        },
        apiPrefix
      });
      console.log('[submitPhishing] Scenario created:', {
        resourceId: scenarioResult.resourceId,
        id: scenarioResult.id
      });
    }

    console.log('[submitPhishing] Campaign submission completed');
    return {
      success: true,
      templateResourceId: templateResult.resourceId,
      templateId: templateResult.id,
      landingPageResourceId: landingPageResult?.resourceId || null,
      landingPageId: landingPageResult?.id || null,
      scenarioResourceId: scenarioResult?.resourceId || null,
      scenarioId: scenarioResult?.id || null,
      message: 'Phishing campaign successfully created'
    };

  } catch (error) {
    console.error('[submitPhishing] Error:', error.message);
    throw new Error(`Failed to submit phishing campaign: ${error.message}`);
  }
}
