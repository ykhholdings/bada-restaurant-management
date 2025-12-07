// FormTrigger.gs - Process Google Form submissions for Purchase receipts

/**
 * This function is triggered when the Google Form is submitted
 * Setup: Form → Responses tab → 3 dots → Script editor → Create trigger
 */
function onFormSubmit(e) {
  try {
    Logger.log('Form submitted: ' + JSON.stringify(e));

    // Get form responses
    var itemResponses = e.response.getItemResponses();

    var branch = '';
    var approver = '';
    var fileId = '';

    // Parse responses
    for (var i = 0; i < itemResponses.length; i++) {
      var question = itemResponses[i].getItem().getTitle();
      var answer = itemResponses[i].getResponse();

      Logger.log('Question: ' + question + ', Answer: ' + answer);

      if (question === 'Branch') {
        branch = answer;
      } else if (question.indexOf('Approver') > -1) {
        approver = answer;
      } else if (question.indexOf('Receipt') > -1 || question.indexOf('Image') > -1) {
        // File upload response is an array of file IDs
        if (Array.isArray(answer) && answer.length > 0) {
          fileId = answer[0];
        }
      }
    }

    Logger.log('Branch: ' + branch + ', Approver: ' + approver + ', FileID: ' + fileId);

    // Map branch names to IDs
    var branchId = mapBranchNameToId(branch);
    var approverId = mapApproverNameToId(approver);

    if (!fileId) {
      Logger.log('No file uploaded');
      return;
    }

    // Get the file from Drive
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var mimeType = blob.getContentType();

    // Create full base64 data URL
    var imageBase64 = 'data:' + mimeType + ';base64,' + base64;

    Logger.log('Image size: ' + Math.round(base64.length / 1024) + ' KB');

    // Process with Claude OCR
    var purchaseData = processPurchaseWithClaude(imageBase64, branchId, approverId);

    Logger.log('Purchase processed: ' + JSON.stringify(purchaseData));

  } catch (error) {
    Logger.log('Error in onFormSubmit: ' + error.toString());
    // Send email notification on error
    sendErrorNotification(error.toString());
  }
}

/**
 * Map branch name from form to branch ID
 */
function mapBranchNameToId(branchName) {
  if (branchName.indexOf('BADA') > -1) return 'BR001';
  if (branchName.indexOf('Al Ghurair') > -1) return 'BR002';
  if (branchName.indexOf('Muraqqabat') > -1) return 'BR003';
  if (branchName.indexOf('Burjuman') > -1) return 'BR004';
  return 'BR001'; // default
}

/**
 * Map approver name to user ID
 */
function mapApproverNameToId(approverName) {
  if (approverName.indexOf('Bhab') > -1) return 'U002';
  if (approverName.indexOf('Admin') > -1) return 'U001';
  return 'U002'; // default
}

/**
 * Process purchase receipt with Claude OCR
 */
function processPurchaseWithClaude(imageBase64, branchId, approverId) {
  // Get Claude API key
  var props = PropertiesService.getScriptProperties();
  var claudeApiKey = props.getProperty('CLAUDE_API_KEY');

  if (!claudeApiKey) {
    throw new Error('Claude API key not configured');
  }

  // Remove data URL prefix if present
  var base64Data = imageBase64;
  if (imageBase64.indexOf(',') > -1) {
    base64Data = imageBase64.split(',')[1];
  }

  // Determine image type
  var imageType = 'image/jpeg';
  if (imageBase64.indexOf('data:image/png') === 0) {
    imageType = 'image/png';
  } else if (imageBase64.indexOf('data:image/jpg') === 0 || imageBase64.indexOf('data:image/jpeg') === 0) {
    imageType = 'image/jpeg';
  } else if (imageBase64.indexOf('data:image/webp') === 0) {
    imageType = 'image/webp';
  }

  // Call Claude OCR
  var ocrResult = callClaudeOCR(claudeApiKey, base64Data, imageType);

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
    'FORM_UPLOAD',      // Uploaded By (from form)
    dateStr,            // Purchase Date
    timeStr,            // Upload Time
    ocrResult.vendor || '',
    ocrResult.total || 0,
    'PENDING',
    approverId,
    '',                 // Approval Date
    '',                 // Note
    imageBase64         // Receipt Image
  ]);

  // Save items to Purchase_Items sheet
  var itemsSheet = ss.getSheetByName('Purchase_Items');
  var items = ocrResult.items || [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    itemsSheet.appendRow([
      generateItemId(),
      purchaseId,
      item.name || '',
      item.quantity || 1,
      item.unit || 'EA',
      item.unit_price || 0,
      item.total_price || 0,
      item.category || 'OTHER'
    ]);
  }

  // Log activity
  logActivity('FORM_UPLOAD', 'PURCHASE_UPLOAD', 'Uploaded receipt: ' + purchaseId);

  return {
    purchase_id: purchaseId,
    vendor: ocrResult.vendor,
    total: ocrResult.total,
    items_count: items.length
  };
}

/**
 * Send error notification email
 */
function sendErrorNotification(errorMessage) {
  try {
    var recipient = Session.getActiveUser().getEmail();
    MailApp.sendEmail({
      to: recipient,
      subject: 'Purchase Form Error',
      body: 'An error occurred while processing a purchase form submission:\n\n' + errorMessage
    });
  } catch (e) {
    Logger.log('Failed to send error email: ' + e.toString());
  }
}
