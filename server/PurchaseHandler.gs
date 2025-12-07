// PurchaseHandler.gs - Purchase Upload with Claude OCR

/**
 * Handle purchase upload
 * @param {Object} data - { image_base64, approver_id, branch_id }
 * @param {string} token - Session token
 * @returns {Object} Purchase record with OCR results
 */
function uploadPurchase(data, token) {
  // Validate session
  var session = validateSession(token);
  if (!session) throw new Error('Invalid or expired session');

  var imageBase64 = data.image_base64;
  var approverId = data.approver_id;
  var branchId = data.branch_id;

  if (!imageBase64 || !approverId || !branchId) {
    throw new Error('Missing required fields: image, approver_id, or branch_id');
  }

  // Get Claude API key from Script Properties
  var props = PropertiesService.getScriptProperties();
  var claudeApiKey = props.getProperty('CLAUDE_API_KEY');

  if (!claudeApiKey) {
    throw new Error('Claude API key not configured. Please set CLAUDE_API_KEY in Script Properties.');
  }

  // Extract base64 data (remove data:image/...;base64, prefix if present)
  var base64Data = imageBase64;
  if (imageBase64.indexOf(',') > -1) {
    base64Data = imageBase64.split(',')[1];
  }

  // Determine image type
  var imageType = 'image/jpeg'; // default
  if (imageBase64.indexOf('data:image/png') === 0) {
    imageType = 'image/png';
  } else if (imageBase64.indexOf('data:image/jpg') === 0 || imageBase64.indexOf('data:image/jpeg') === 0) {
    imageType = 'image/jpeg';
  } else if (imageBase64.indexOf('data:image/webp') === 0) {
    imageType = 'image/webp';
  }

  // Call Claude API for OCR
  var ocrResult = callClaudeOCR(claudeApiKey, base64Data, imageType);

  // Parse OCR result
  var items = parseReceiptItems(ocrResult.text);

  // Generate Purchase ID
  var purchaseId = generatePurchaseId();

  // Save to Purchases sheet
  var ss = getSpreadsheet();
  var purchaseSheet = ss.getSheetByName('Purchases');

  var now = new Date();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

  purchaseSheet.appendRow([
    purchaseId,
    branchId,
    session.user_id,          // Uploaded By
    dateStr,                   // Purchase Date
    timeStr,                   // Upload Time
    ocrResult.vendor || '',    // Vendor Name
    ocrResult.total || 0,      // Total Amount
    'PENDING',                 // Status
    approverId,                // Approver ID
    '',                        // Approval Date
    '',                        // Note
    imageBase64                // Receipt Image (base64)
  ]);

  // Save items to Purchase_Items sheet
  var itemsSheet = ss.getSheetByName('Purchase_Items');

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    itemsSheet.appendRow([
      generateItemId(),        // ID
      purchaseId,              // Purchase ID
      item.name || '',         // Item Name
      item.quantity || 1,      // Quantity
      item.unit || 'EA',       // Unit
      item.unit_price || 0,    // Unit Price
      item.total_price || 0,   // Total Price
      item.category || 'OTHER' // Category
    ]);
  }

  // Log activity
  logActivity(session.user_id, 'PURCHASE_UPLOAD', 'Uploaded receipt: ' + purchaseId);

  return {
    purchase_id: purchaseId,
    vendor: ocrResult.vendor,
    total: ocrResult.total,
    items_count: items.length,
    items: items,
    status: 'PENDING'
  };
}

/**
 * Call Claude API for OCR
 * @param {string} apiKey - Claude API key
 * @param {string} base64Data - Base64 encoded image
 * @param {string} imageType - MIME type (image/jpeg, image/png, etc)
 * @returns {Object} OCR result { text, vendor, total }
 */
function callClaudeOCR(apiKey, base64Data, imageType) {
  var url = 'https://api.anthropic.com/v1/messages';

  var prompt = `You are an OCR assistant for a restaurant management system. Analyze this receipt image and extract:

1. Vendor/Store name
2. All items purchased with their quantities and prices
3. Total amount

Return the results in this JSON format:
{
  "vendor": "Store Name",
  "total": 123.45,
  "items": [
    {
      "name": "Item name",
      "quantity": 2,
      "unit": "KG",
      "unit_price": 10.50,
      "total_price": 21.00,
      "category": "INGREDIENT"
    }
  ]
}

Categories should be one of: INGREDIENT, SUPPLY, EQUIPMENT, OTHER
Units should be: KG, G, L, ML, EA, PACK, BOX

Be precise with numbers. If you can't read something clearly, use your best judgment.`;

  var payload = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (responseCode !== 200) {
      Logger.log('Claude API Error: ' + responseCode + ' - ' + responseText);
      throw new Error('Claude API error: ' + responseCode);
    }

    var result = JSON.parse(responseText);
    var content = result.content[0].text;

    // Extract JSON from response (Claude might wrap it in markdown)
    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      return {
        text: content,
        vendor: parsed.vendor || 'Unknown Vendor',
        total: parsed.total || 0,
        items: parsed.items || []
      };
    } else {
      // Fallback: return raw text
      return {
        text: content,
        vendor: 'Unknown Vendor',
        total: 0,
        items: []
      };
    }
  } catch (error) {
    Logger.log('Claude OCR Error: ' + error.toString());
    throw new Error('OCR failed: ' + error.message);
  }
}

/**
 * Parse receipt items from OCR text
 * @param {string} text - OCR result text
 * @returns {Array} Array of items
 */
function parseReceiptItems(text) {
  try {
    // Try to extract JSON
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      if (parsed.items && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch (e) {
    Logger.log('Failed to parse items JSON: ' + e.toString());
  }

  // Fallback: return empty array
  return [];
}

/**
 * Generate unique Purchase ID
 * @returns {string} Purchase ID in format PUR-YYYYMMDD-XXXXX
 */
function generatePurchaseId() {
  var now = new Date();
  var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return 'PUR-' + dateStr + '-' + random;
}

/**
 * Generate unique Item ID
 * @returns {string} Item ID in format PI-XXXXX
 */
function generateItemId() {
  var timestamp = new Date().getTime();
  var random = Math.floor(Math.random() * 10000);
  return 'PI-' + timestamp + '-' + random;
}

/**
 * List purchases with optional filters
 * @param {Object} data - { branch_id, status, date_from, date_to }
 * @param {string} token - Session token
 * @returns {Array} List of purchases
 */
function listPurchases(data, token) {
  var session = validateSession(token);
  if (!session) throw new Error('Invalid or expired session');

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Purchases');
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

  var purchases = [];

  // Skip header row
  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    var purchase = {
      id: row[0],
      branch_id: row[1],
      uploaded_by: row[2],
      purchase_date: row[3],
      upload_time: row[4],
      vendor: row[5],
      total: row[6],
      status: row[7],
      approver_id: row[8],
      approval_date: row[9],
      note: row[10]
      // Exclude image_base64 from list view for performance
    };

    // Apply filters
    if (data.branch_id && purchase.branch_id !== data.branch_id) continue;
    if (data.status && purchase.status !== data.status) continue;

    purchases.push(purchase);
  }

  return purchases;
}

/**
 * Approve or reject purchase
 * @param {Object} data - { purchase_id, status, note }
 * @param {string} token - Session token
 * @returns {Object} Updated purchase
 */
function approvePurchase(data, token) {
  var session = validateSession(token);
  if (!session) throw new Error('Invalid or expired session');

  var purchaseId = data.purchase_id;
  var status = data.status; // 'APPROVED' or 'REJECTED'
  var note = data.note || '';

  if (!purchaseId || !status) {
    throw new Error('Missing purchase_id or status');
  }

  if (status !== 'APPROVED' && status !== 'REJECTED') {
    throw new Error('Invalid status. Must be APPROVED or REJECTED');
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Purchases');
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

  // Find purchase row
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === purchaseId) {
      var now = new Date();
      var approvalDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

      // Update status, approval date, and note
      sheet.getRange(i + 1, 8).setValue(status);        // Status column
      sheet.getRange(i + 1, 10).setValue(approvalDate); // Approval Date column
      sheet.getRange(i + 1, 11).setValue(note);         // Note column

      // Log activity
      logActivity(session.user_id, 'PURCHASE_APPROVAL', status + ': ' + purchaseId);

      return {
        purchase_id: purchaseId,
        status: status,
        approval_date: approvalDate,
        note: note
      };
    }
  }

  throw new Error('Purchase not found: ' + purchaseId);
}
