import { parseJWT, getCompanyIdFromToken } from '../utils/jwtHelper.js';

/**
 * Send phishing scenario as campaign to target user
 *
 * STEP 1: Target group search (Agentic Ally Group - ${targetUserResourceId})
 * STEP 2: Create target group if not found
 * STEP 3: Send campaign to the group
 *
 * @param {Object} params
 * @param {string} params.accessToken - JWT authentication token
 * @param {string} params.url - API base URL
 * @param {string} params.scenarioResourceId - Phishing scenario resource ID
 * @param {string} params.targetUserResourceId - Target user resource ID
 * @param {string} params.name - Campaign name (scenario name)
 * @returns {Promise<Object>} - Send result
 */
export async function sendPhishing({
  accessToken,
  url,
  scenarioResourceId,
  targetUserResourceId,
  name
}) {
  try {
    console.log('[sendPhishing] Starting phishing campaign distribution');
    console.log('[sendPhishing] Scenario Resource ID:', scenarioResourceId);
    console.log('[sendPhishing] Target User Resource ID:', targetUserResourceId);
    console.log('[sendPhishing] Campaign name:', name);

    // Parse JWT and extract company ID
    const tokenPayload = parseJWT(accessToken);
    const companyId = getCompanyIdFromToken(tokenPayload);

    if (!companyId) {
      throw new Error('Unable to extract company ID from token');
    }

    console.log('[sendPhishing] Company ID:', companyId);

    // STEP 1: Search for target group
    const groupName = `Agentic Ally Group - ${targetUserResourceId}`;
    console.log('[STEP 1] Searching for target group:', groupName);

    const searchResult = await searchTargetGroups(url, accessToken, companyId, groupName);
    let targetGroupResourceId = null;

    if (searchResult.data?.results && searchResult.data.results.length > 0) {
      targetGroupResourceId = searchResult.data.results[0].resourceId;
      console.log('[STEP 1] ✓ Target group found:', targetGroupResourceId);
    } else {
      // STEP 2: Create target group if not found
      console.log('[STEP 2] Target group not found, creating new one...');
      const createResult = await createTargetGroup(url, accessToken, companyId, groupName);
      targetGroupResourceId = createResult.data?.resourceId;
      console.log('[STEP 2] ✓ Target group created:', targetGroupResourceId);
    }

    if (!targetGroupResourceId) {
      throw new Error('Failed to get target group resource ID');
    }

    // STEP 3: Get default email delivery settings
    console.log('[STEP 3] Fetching default email delivery settings...');

    const defaultSettingsResult = await getDefaultEmailDeliverySetting(url, accessToken, companyId);
    const emailDeliverySettingType = defaultSettingsResult.data?.type || 1;
    const smtpSettingResourceId = defaultSettingsResult.data?.resourceId || '';
    console.log('[STEP 3] ✓ Default email delivery settings retrieved');
    console.log('  - emailDeliverySettingType:', emailDeliverySettingType);
    console.log('  - smtpSettingResourceId:', smtpSettingResourceId);

    // STEP 4: Send campaign to the target group
    console.log('[STEP 4] Sending campaign to target group...');

    const payload = {
      phishingScenarios: [
        {
          phishingScenarioResourceId: scenarioResourceId,
          trainingId: '',
          trainingLanguageIds: []
        }
      ],
      name: name || 'Phishing Campaign',
      scheduleTypeId: '1',
      duration: 365,
      targetGroupResourceIds: [targetGroupResourceId],
      distributionTypeId: '1',
      distributionDelayEvery: 20,
      distributionDelayTimeTypeId: '1',
      distributionEmailOver: 8,
      distributionEmailOverTimeTypeId: '1',
      sendingLimit: 50,
      excludeFromReports: false,
      sendOnlyActiveUsers: false,
      sendRandomlyUsers: false,
      sendRandomlyUsersCount: '20',
      sendRandomlyUsersCalculateTypeId: '1',
      emailDeliverySettingType: emailDeliverySettingType,
      smtpSettingResourceId: smtpSettingResourceId
    };

    console.log('[sendPhishing] Campaign payload prepared');
    console.log('[sendPhishing] Full payload:', JSON.stringify(payload, null, 2));

    // Send to API
    const response = await fetch(`${url}/api/phishing-simulator/phishing-campaign`, {
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
      throw new Error(
        `API error: ${response.status} - ${errorData.message || 'Unknown error'}`
      );
    }

    const result = await response.json();

    console.log('[sendPhishing] Phishing campaign sent successfully');
    console.log('[STEP 4] ✓ Campaign sent to target group');

    return {
      success: true,
      message: 'Phishing campaign successfully sent',
      campaignId: result.data?.resourceId || result.resourceId,
      campaignName: name,
      targetUserResourceId: targetUserResourceId,
      targetGroupResourceId: targetGroupResourceId,
      groupName: groupName,
      distributionStarted: true
    };

  } catch (error) {
    console.error('[sendPhishing] Error:', error.message);
    throw new Error(`Failed to send phishing campaign: ${error.message}`);
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Search for target group by name
 */
async function searchTargetGroups(apiUrl, accessToken, companyId, searchQuery) {
  try {
    const payload = {
      pageNumber: 1,
      pageSize: 10,
      orderBy: 'CreateTime',
      ascending: false,
      filter: {
        Condition: 'AND',
        SearchInputTextValue: '',
        FilterGroups: [
          {
            Condition: 'AND',
            FilterItems: [],
            FilterGroups: []
          },
          {
            Condition: 'OR',
            FilterItems: [{
              FieldName: 'Name',
              Operator: 'Contains',
              Value: searchQuery
            }],
            FilterGroups: []
          }
        ]
      },
      systemGeneratedGroups: true
    };

    console.log('[STEP 1] Searching target groups for:', searchQuery);

    const response = await fetch(`${apiUrl}/api/target-groups/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-IR-COMPANY-ID': companyId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to search target groups. Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[STEP 1] ✓ Search successful, found:', result.data?.results?.length || 0, 'groups');
    return result;

  } catch (error) {
    throw new Error(`Target groups search error: ${error.message}`);
  }
}

/**
 * Create new target group
 */
async function createTargetGroup(apiUrl, accessToken, companyId, groupName) {
  try {
    const payload = {
      name: groupName,
      priority: 'Medium'
    };

    console.log('[createTargetGroup] Creating new target group:', groupName);

    const response = await fetch(`${apiUrl}/api/target-groups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-IR-COMPANY-ID': companyId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create target group. Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[createTargetGroup] ✓ Target group created successfully');
    console.log('  - ResourceID:', result.data?.resourceId);
    return result;

  } catch (error) {
    throw new Error(`Target group creation error: ${error.message}`);
  }
}

/**
 * Get default email delivery settings
 */
async function getDefaultEmailDeliverySetting(apiUrl, accessToken, companyId) {
  try {
    console.log('[getDefaultEmailDeliverySetting] Fetching default email delivery settings');

    const response = await fetch(`${apiUrl}/api/phishing-simulator/phishing-campaign/default-email-delivery-setting`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-IR-COMPANY-ID': companyId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get default email delivery settings. Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[getDefaultEmailDeliverySetting] ✓ Default email delivery settings retrieved');
    return result;

  } catch (error) {
    throw new Error(`Default email delivery settings error: ${error.message}`);
  }
}

