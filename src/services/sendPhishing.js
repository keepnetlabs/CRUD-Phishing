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
 * @param {string} [params.trainingId] - Training ID (UUID) - optional
 * @param {string[]} [params.trainingLanguageIds] - Training language IDs (UUID array) - optional
 * @param {string} [params.targetGroupResourceId] - Target group resource ID - optional (if provided, skips group creation)
 * @param {string} [params.apiPrefix='phishing-simulator'] - API prefix (phishing-simulator or quishing-simulator)
 * @returns {Promise<Object>} - Send result
 */
export async function sendPhishing({
  accessToken,
  url,
  scenarioResourceId,
  targetUserResourceId,
  name,
  trainingId,
  trainingLanguageIds,
  targetGroupResourceId,
  apiPrefix = 'phishing-simulator',
  companyId: payloadCompanyId
}) {
  try {
    console.log('[sendPhishing] Starting phishing campaign distribution');
    console.log('[sendPhishing] Scenario Resource ID:', scenarioResourceId);
    console.log('[sendPhishing] Target User Resource ID:', targetUserResourceId);
    console.log('[sendPhishing] Campaign name:', name);
    console.log('[sendPhishing] Training ID:', trainingId || 'not provided');
    console.log('[sendPhishing] Training Language IDs:', trainingLanguageIds || 'not provided');

    // Parse JWT and resolve company ID (prefer payload override)
    const tokenPayload = parseJWT(accessToken);
    const tokenCompanyId = getCompanyIdFromToken(tokenPayload);
    const finalCompanyId = payloadCompanyId || tokenCompanyId;

    if (!finalCompanyId) {
      throw new Error('Unable to determine company ID from payload or token');
    }

    console.log(
      '[sendPhishing] Company ID:',
      finalCompanyId,
      payloadCompanyId ? '(from payload)' : '(from token)'
    );

    // STEP 1 & 2: Get or create target group (skip if targetGroupResourceId is provided)
    let finalTargetGroupResourceId = targetGroupResourceId;

    if (!finalTargetGroupResourceId) {
      const groupName = `Agentic Ally Group - ${targetUserResourceId}`;
      console.log('[STEP 1] Searching for target group:', groupName);

      const searchResult = await searchTargetGroups(url, accessToken, finalCompanyId, groupName);

      if (searchResult.data?.results && searchResult.data.results.length > 0) {
        finalTargetGroupResourceId = searchResult.data.results[0].resourceId;
        console.log('[STEP 1] ✓ Target group found:', finalTargetGroupResourceId);
      } else {
        // STEP 2: Create target group if not found
        console.log('[STEP 2] Target group not found, creating new one...');
        const createResult = await createTargetGroup(url, accessToken, finalCompanyId, groupName);
        finalTargetGroupResourceId = createResult.data?.resourceId;
        console.log('[STEP 2] ✓ Target group created:', finalTargetGroupResourceId);

        // STEP 2b: Assign user to the newly created target group
        if (finalTargetGroupResourceId && targetUserResourceId) {
          try {
            await assignUserToTargetGroup(url, accessToken, finalCompanyId, targetUserResourceId, finalTargetGroupResourceId);
          } catch (error) {
            console.log('[STEP 2b] User assignment failed but continuing:', error.message);
          }
        }
      }

      if (!finalTargetGroupResourceId) {
        throw new Error('Failed to get target group resource ID');
      }
    } else {
      console.log('[STEP 1-2] Skipped: Using provided targetGroupResourceId:', finalTargetGroupResourceId);
    }

    // STEP 3: Get default email delivery settings
    console.log('[STEP 3] Fetching default email delivery settings...');

    const defaultSettingsResult = await getDefaultEmailDeliverySetting(url, accessToken, finalCompanyId, apiPrefix);
    const emailDeliverySettingType = defaultSettingsResult.data?.type || 1;
    const settingResourceId = defaultSettingsResult.data?.resourceId || '';
    console.log('[STEP 3] ✓ Default email delivery settings retrieved');
    console.log('  - emailDeliverySettingType:', emailDeliverySettingType);
    console.log('  - settingResourceId:', settingResourceId);

    // STEP 4: Send campaign to the target group
    console.log('[STEP 4] Sending campaign to target group...');

    // Build phishing scenario object
    const phishingScenario = {
      phishingScenarioResourceId: scenarioResourceId,
      trainingId: trainingId || '',
      trainingLanguageIds: trainingLanguageIds || [],
      enrollmentReminder: null,
      awardCertificate: false,
      certificateConfigSendType: 'SendOnFirstAttempt',
      enrollmentSendTypeId: '1'
    };

    // Add static training redirect page if trainingId is provided
    if (trainingId) {
      phishingScenario.trainingRedirectPage = {
        informationMessage: 'Because you failed the phishing simulation test, you have been assigned to a training selected by the company admin',
        redirectMessage: 'Please start the training and complete the training as soon as possible',
        startButtonLabel: 'Start Training'
      };
    }

    const payload = {
      phishingScenarios: [phishingScenario],
      name: name || 'Phishing Campaign',
      scheduleTypeId: '1',
      duration: 365,
      targetGroupResourceIds: [finalTargetGroupResourceId],
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
      emailDeliverySettingType: emailDeliverySettingType
    };

    // Add email setting resource ID based on type
    if (emailDeliverySettingType === 2) {
      payload.directEmailSettingResourceId = settingResourceId;
    } else {
      payload.smtpSettingResourceId = settingResourceId;
    }

    console.log('[sendPhishing] Campaign payload prepared');
    console.log('[sendPhishing] Full payload:', JSON.stringify(payload, null, 2));

    // Send to API
    const response = await fetch(`${url}/api/${apiPrefix}/phishing-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-IR-API-KEY': 'apikey',
        'X-IR-COMPANY-ID': finalCompanyId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[sendPhishing] API Error:', errorData);
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
      targetGroupResourceId: finalTargetGroupResourceId,
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
 * Assign user to target group
 */
async function assignUserToTargetGroup(apiUrl, accessToken, companyId, targetUserResourceId, targetGroupResourceId) {
  try {
    const payload = {
      targetUserResourceIds: [targetUserResourceId],
      selectAll: false,
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
            FilterItems: [],
            FilterGroups: []
          }
        ]
      },
      excludedResourceIdList: [],
      targetGroupResourceIds: [targetGroupResourceId]
    };

    console.log('[assignUserToTargetGroup] Assigning user to target group');
    console.log('  - User:', targetUserResourceId);
    console.log('  - Group:', targetGroupResourceId);

    const response = await fetch(`${apiUrl}/api/target-groups/users`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-IR-COMPANY-ID': companyId
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to assign user to target group. Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[assignUserToTargetGroup] ✓ User assigned to target group successfully');
    return result;

  } catch (error) {
    throw new Error(`User assignment error: ${error.message}`);
  }
}

/**
 * Get default email delivery settings
 */
async function getDefaultEmailDeliverySetting(apiUrl, accessToken, companyId, apiPrefix = 'phishing-simulator') {
  try {
    console.log('[getDefaultEmailDeliverySetting] Fetching default email delivery settings');

    const response = await fetch(`${apiUrl}/api/${apiPrefix}/phishing-campaign/default-email-delivery-setting`, {
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

