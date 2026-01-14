import { submitPhishing } from './services/submitPhishing.js';
import { sendPhishing } from './services/sendPhishing.js';

/**
 * Cloudflare Worker - Phishing Campaign Management Endpoints
 *
 * POST /submit - Create and submit phishing email template, landing page, and scenario
 * {
 *   "accessToken": "JWT token",
 *   "url": "API base URL",
 *   "baseUrl": "Frontend base URL",
 *   "phishingData": {
 *     "name": "Campaign name",
 *     "description": "Campaign description",
 *     "landingPage": {
 *       "name": "Landing page name",
 *       "description": "Landing page description",
 *       "method": "Data-Submission" or "Click-Only",
 *       "difficulty": "Easy", "Medium", "Hard",
 *       "language": "en",
 *       "pages": [...]
 *     }
 *   }
 * }
 *
 * POST /send - Send phishing scenario to target user
 * {
 *   "accessToken": "JWT token",
 *   "url": "API base URL",
 *   "scenarioResourceId": "Phishing scenario resource ID",
 *   "targetUserResourceId": "Target user resource ID",
 *   "name": "Campaign name",
 *   "trainingId": "Training ID (UUID) - optional",
 *   "sendTrainingLanguageId": "Training language ID (UUID) - optional, single ID",
 *   "trainingLanguageIds": ["Training language IDs (UUID array) - optional"]
 * }
 *
 * ALL LOGIC in services/ directory!
 */

export default {
  async fetch(request) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine route from URL
    const url = new URL(request.url);
    const path = url.pathname;

    console.log('=== PHISHING WORKER REQUEST ===');
    console.log('Path:', path);

    try {
      // SUBMIT action - Create phishing email template, landing page, and scenario
      if (path === '/submit' || path === '/') {
        return await handleSubmit(request);
      }

      // SEND action - Send phishing scenario to target user
      if (path === '/send') {
        return await handleSend(request);
      }

      // Unknown path
      return new Response(
        JSON.stringify({
          error: 'Not found',
          availableEndpoints: ['/submit', '/send']
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error('=== PHISHING WORKER ERROR ===', error);
      return new Response(
        JSON.stringify({
          error: error.message || 'Unknown error occurred'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};

// ===== ROUTE HANDLERS =====

async function handleSubmit(request) {
  try {
    const body = await request.json();
    let { accessToken, url, baseUrl, phishingData, companyId } = body;

    // URL dönüşümü: dash.keepnetlabs.com -> api.keepnetlabs.com
    if (url && url.includes('dash.keepnetlabs.com')) {
      url = url.replace('dash.keepnetlabs.com', 'api.keepnetlabs.com');
      console.log('[API URL] Converted: dash.keepnetlabs.com -> api.keepnetlabs.com');
    }

    // Validate required fields
    if (!accessToken || !url || !phishingData) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['accessToken', 'url', 'phishingData']
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('=== PHISHING SUBMIT ACTION ===');
    console.log('Campaign name:', phishingData.name);
    if (companyId) {
      console.log('Company ID provided in payload:', companyId);
    }

    // Call submitPhishing() function
    const result = await submitPhishing({
      accessToken,
      url,
      baseUrl,
      phishingData,
      companyId
    });

    console.log('=== PHISHING SUBMIT SUCCESS ===');
    console.log('Scenario ID:', result.scenarioId);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('=== PHISHING SUBMIT ERROR ===', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Submit failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleSend(request) {
  try {
    const body = await request.json();
    const { 
      accessToken, 
      apiUrl,           // payload'dan gelen apiUrl
      url,              // backward compatibility için
      companyId,        // payload'dan gelen companyId (optional)
      phishingId,       // payload'dan gelen phishingId (scenarioResourceId)
      scenarioResourceId, // backward compatibility için
      languageId,       // payload'dan gelen (ignored)
      targetUserResourceId,
      targetGroupResourceId,  // payload'dan gelen (optional)
      name,
      trainingId,
      sendTrainingLanguageId,
      trainingLanguageIds,
      isQuishing        // payload'dan gelen (optional)
    } = body;

    // Map payload fields to expected fields
    let finalUrl = apiUrl || url;
    const finalScenarioResourceId = phishingId || scenarioResourceId;

    // URL dönüşümü: dash.keepnetlabs.com -> api.keepnetlabs.com
    if (finalUrl && finalUrl.includes('dash.keepnetlabs.com')) {
      finalUrl = finalUrl.replace('dash.keepnetlabs.com', 'api.keepnetlabs.com');
      console.log('[API URL] Converted: dash.keepnetlabs.com -> api.keepnetlabs.com');
    }

    // Validate required fields
    const missingFields = [];
    if (!accessToken) missingFields.push('accessToken');
    if (!finalUrl) missingFields.push('apiUrl (or url)');
    if (!finalScenarioResourceId) missingFields.push('phishingId (or scenarioResourceId)');
    // Either targetUserResourceId or targetGroupResourceId is required
    if (!targetUserResourceId && !targetGroupResourceId) missingFields.push('targetUserResourceId (or targetGroupResourceId)');
    if (!name) missingFields.push('name');

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          missing: missingFields,
          required: ['accessToken', 'apiUrl (or url)', 'phishingId (or scenarioResourceId)', 'targetUserResourceId (or targetGroupResourceId)', 'name']
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('=== PHISHING SEND ACTION ===');
    console.log('API URL:', finalUrl);
    console.log('Company ID:', companyId || 'will be extracted from token');
    console.log('Scenario Resource ID (phishingId):', finalScenarioResourceId);
    console.log('Target User Resource ID:', targetUserResourceId);
    console.log('Campaign name:', name);
    console.log('Training ID:', trainingId || 'not provided');
    console.log('Training Language IDs:', trainingLanguageIds || sendTrainingLanguageId || 'not provided');
    console.log('Target Group Resource ID:', targetGroupResourceId || 'will be created');

    // Handle both sendTrainingLanguageId (single) and trainingLanguageIds (array)
    // If sendTrainingLanguageId is provided, convert it to array
    const finalTrainingLanguageIds = trainingLanguageIds || 
      (sendTrainingLanguageId ? [sendTrainingLanguageId] : undefined);

    // Determine API prefix based on isQuishing flag
    const apiPrefix = isQuishing ? 'quishing-simulator' : 'phishing-simulator';
    console.log('API Prefix:', apiPrefix, '(isQuishing:', isQuishing || false + ')');

    // Call sendPhishing() function
    const result = await sendPhishing({
      accessToken,
      url: finalUrl,
      scenarioResourceId: finalScenarioResourceId,
      companyId,
      targetUserResourceId,
      name,
      trainingId,
      trainingLanguageIds: finalTrainingLanguageIds,
      targetGroupResourceId,
      apiPrefix
    });

    console.log('=== PHISHING SEND SUCCESS ===');
    console.log('Result:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('=== PHISHING SEND ERROR ===', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Send failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
