/**
 * Create phishing scenario - Combines email template and landing page
 *
 * @param {Object} params
 * @param {string} params.accessToken - JWT authentication token
 * @param {string} params.companyId - Company resource ID
 * @param {string} params.url - API base URL
 * @param {number} params.templateId - Email template ID (numeric)
 * @param {number} params.landingPageId - Landing page template ID (numeric)
 * @param {Object} params.scenarioData - Scenario metadata
 * @param {string} [params.apiPrefix='phishing-simulator'] - API prefix (phishing-simulator or quishing-simulator)
 * @returns {Promise<Object>} - Created scenario details
 */
export async function submitPhishingScenario({
  accessToken,
  companyId,
  url,
  templateId,
  landingPageId,
  scenarioData,
  apiPrefix = 'phishing-simulator'
}) {
  try {
    console.log('[submitPhishingScenario] Starting scenario creation');
    console.log('[submitPhishingScenario] Template ID:', templateId);
    console.log('[submitPhishingScenario] Landing Page ID:', landingPageId);

    // Step 1: Build payload with new structure
    const scenarioName = `${scenarioData.templateName} - Agentic Ally Scenario`;
    const scenarioDescription = scenarioData.templateDescription || '';

    console.log('[submitPhishingScenario] Scenario name:', scenarioName);
    console.log('[submitPhishingScenario] Scenario description:', scenarioDescription);

    const payload = {
      name: scenarioName,
      description: scenarioDescription,
      categoryId: '2',
      methodTypeId: scenarioData.methodTypeId || '1',
      difficultyTypeId: '1',
      emailTemplateId: templateId,
      landingPageTemplateId: landingPageId,
      tags: [],
      roleResourceIds: (!url.includes('test') && !url.includes('localhost')) 
        ? ["xctakTerFXAC"] 
        : ["tnn14n1Q2LWK"],
      mfaSenderNumberResourceId: '',
      mfaTextTemplate: 'Your verification code: {MFA_CODE}',
      availableForRequests: [
        {
          id: 'MyCompanyOnly',
          label: 'My company only',
          type: 'MyCompanyOnly',
          resourceId:  null
        }
      ]
    };

    console.log('[submitPhishingScenario] Payload prepared');
    console.log('[submitPhishingScenario] Full payload:', JSON.stringify(payload, null, 2));

    // Step 2: Send to API
    const response = await fetch(`${url}/api/${apiPrefix}/phishing-scenario`, {
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
      const errorData = await response.json().catch(() => ({}));
      console.error('[submitPhishingScenario] API Error:', errorData);
      throw new Error(
        `API error: ${response.status} - ${errorData.message || 'Unknown error'}`
      );
    }

    const result = await response.json();

    console.log('[submitPhishingScenario] Scenario created successfully');

    // Extract from nested data structure
    const createdScenarioData = result.data?.searchPsScenario || result.searchPsScenario || result;
    const resourceId = result.data?.resourceId || result.resourceId;
    const id = createdScenarioData?.id;

    console.log('[submitPhishingScenario] Scenario ResourceId:', resourceId);
    console.log('[submitPhishingScenario] Scenario ID:', id);

    return {
      success: true,
      resourceId: resourceId,
      id: id,
      name: createdScenarioData?.name || result.name,
      message: 'Phishing scenario successfully created'
    };

  } catch (error) {
    console.error('[submitPhishingScenario] Error:', error.message);
    throw new Error(`Failed to create phishing scenario: ${error.message}`);
  }
}
