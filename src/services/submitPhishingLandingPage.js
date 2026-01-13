import { getLanguageResourceId } from '../utils/languageHelper.js';
import { difficultyTypeItems, methodTypeItems } from '../utils/constants.js';

/**
 * Create phishing landing page
 *
 * @param {Object} params
 * @param {string} params.accessToken - JWT authentication token
 * @param {string} params.companyId - Company resource ID
 * @param {string} params.url - API base URL
 * @param {Object} params.landingPageData - Landing page data with full configuration
 * @param {string} [params.apiPrefix='phishing-simulator'] - API prefix (phishing-simulator or quishing-simulator)
 * @returns {Promise<Object>} - Created landing page details
 */
export async function submitPhishingLandingPage({ accessToken, companyId, url, landingPageData, apiPrefix = 'phishing-simulator' }) {
  try {
    console.log('[submitPhishingLandingPage] Starting landing page creation');
    console.log('[submitPhishingLandingPage] Pages count:', landingPageData.pages?.length || 0);

    // Step 1: Get language resourceId
    const languageResourceId = getLanguageResourceId(landingPageData.language);
    console.log('[submitPhishingLandingPage] Language resourceId:', languageResourceId);

    // Step 1b: Get methodTypeId from method name (normalize hyphens to spaces)
    const normalizedMethod = landingPageData.method?.replace(/-/g, ' ') || '';
    const methodType = methodTypeItems.find(m => m.text === normalizedMethod);
    const methodTypeId = methodType?.value || '1';
    console.log('[submitPhishingLandingPage] Method:', landingPageData.method, '→ MethodTypeId:', methodTypeId);

    // Step 1c: Get difficultyTypeId from difficulty name
    const difficultyType = difficultyTypeItems.find(d => d.text === landingPageData.difficulty);
    const difficultyTypeId = difficultyType?.value || '1';
    console.log('[submitPhishingLandingPage] DifficultyTypeId:', difficultyTypeId);

    // Step 2: Build complete payload
    const payload = {
      urlSchemaTypeId:  '2',
      subDomain: 'www',
      domainRecordId: '13',
      pathTypeId:  '1',
      extensionTypeId: '1',
      parameterTypeId:  '1',
      isInvisibleCaptchaEnabled: true,
      name: landingPageData.name || '',
      description: landingPageData.description || '',
      methodTypeId,
      difficultyTypeId,
      tags: [],
      landingPages: (landingPageData.pages || []).map((page, index) => ({
        name: page.name || `Page ${index + 1}`,
        content: page.template || page.content || '',
        order: page.order || index + 1
      })),
      languageTypeResourceId: languageResourceId,
      isAssistedByAI: landingPageData.isAssistedByAI ?? false,
      availableForRequests: [
        {
          resourceId:  null,
          type: 'MyCompanyOnly'
        }
      ]
    };

    console.log('[submitPhishingLandingPage] Payload prepared');
    console.log('[submitPhishingLandingPage] Landing pages:', payload.landingPages.length);
    console.log('[submitPhishingLandingPage] Full payload:', JSON.stringify(payload, null, 2));

    // Step 4: Send to API
    const apiUrl = `${url}/api/${apiPrefix}/landing-page-template`;
    console.log('[submitPhishingLandingPage] API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-IR-API-KEY': 'apikey',
        'X-IR-COMPANY-ID': companyId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `Unknown error`;
      let errorDetails = {};
      
      try {
        const errorData = await response.json();
        errorDetails = errorData;
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        console.error('[submitPhishingLandingPage] API Error Response:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        const errorText = await response.text().catch(() => '');
        console.error('[submitPhishingLandingPage] API Error Text:', errorText);
        errorMessage = errorText || errorMessage;
      }
      
      console.error('[submitPhishingLandingPage] API Error Status:', response.status);
      console.error('[submitPhishingLandingPage] API Error Details:', errorDetails);
      
      throw new Error(
        `API error: ${response.status} - ${errorMessage}`
      );
    }

    const result = await response.json();

    console.log('[submitPhishingLandingPage] Landing page created successfully');

    // Extract from nested data structure
    const createdLandingPageData = result.data?.landingPageTemplate || result.searchPsLandingPage || result;
    const resourceId = result.data?.resourceId || result.resourceId;
    const id = createdLandingPageData?.id;

    console.log('[submitPhishingLandingPage] Landing page ResourceId:', resourceId);
    console.log('[submitPhishingLandingPage] Landing page ID:', id);

    return {
      success: true,
      resourceId: resourceId,
      id: id,
      name: createdLandingPageData?.name || result.name,
      message: 'Landing page successfully created'
    };

  } catch (error) {
    console.error('[submitPhishingLandingPage] Error:', error.message);
    throw new Error(`Failed to create landing page: ${error.message}`);
  }
}
