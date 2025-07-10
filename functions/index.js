const functions = require('firebase-functions');

// =============================================================================
// MODULAR CONFIGURATION - Add to these arrays to auto-generate functions
// =============================================================================

const DATABASES = ['auburn', 'oxford'];
const COLLECTIONS = ['bookings', 'bookingDrafts', 'archivedBookings', 'bookingQuotes', 'contactMessages'];

// Configuration
const WEBHOOK_URL = functions.config().webhook?.url || 'https://your-api-server.com/api/MeilisearchWebhook';
const WEBHOOK_SECRET = functions.config().webhook?.secret || 'fallback-secret';

// Log configuration on startup (don't log secret for security)
console.log('🔧 Firebase Functions Configuration:');
console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
console.log(`🔐 Webhook Secret: ${WEBHOOK_SECRET ? 'configured' : 'NOT CONFIGURED'}`);
console.log(`🏢 Project: ${process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'unknown'}`);
console.log(`📦 Node Version: ${process.version}`);
console.log(`🗄️ Databases: [${DATABASES.join(', ')}]`);
console.log(`📊 Collections: [${COLLECTIONS.join(', ')}]`);

/**
 * Call webhook to sync data to Meilisearch
 * @param {string} operation - CREATE, UPDATE, DELETE
 * @param {object} data - Document data
 * @param {string} id - Document ID
 * @param {string} collection - Collection name
 * @param {string} campus - auburn or oxford
 */
async function callWebhook(operation, data, id, collection, campus) {
  console.log(`🚀 [${campus.toUpperCase()}] Starting webhook call: ${operation} ${collection}:${id}`);
  
  const payload = { 
    operation, 
    data, 
    id, 
    collection, 
    campus,
    secret: WEBHOOK_SECRET
  };
  const payloadString = JSON.stringify(payload);
  
  console.log(`🔐 Including secret in payload`);
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Firebase-Functions/r2r-dev'
      },
      body: payloadString,
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`📥 Webhook response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Webhook error response: ${errorText}`);
      throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
    }
    
    const responseData = await response.text();
    console.log(`📄 Webhook response body: ${responseData}`);
    
    console.log(`✅ [${campus.toUpperCase()}] Webhook success: ${operation} ${collection}:${id}`);
  } catch (error) {
    console.error(`❌ [${campus.toUpperCase()}] Webhook failed: ${operation} ${collection}:${id}`, {
      error: error.message,
      campus,
      operation,
      collection,
      id,
      webhookUrl: WEBHOOK_URL
    });
    
    // Don't throw - we don't want to retry failed webhooks automatically
    // Consider implementing a dead letter queue if needed
  }
}

/**
 * Create a generic Firestore document change handler
 * @param {string} database - Database name
 * @param {string} collection - Collection name
 */
function createDocumentHandler(database, collection) {
  return async (change, context) => {
    const docId = context.params[`${collection.slice(0, -1)}Id`]; // Remove 's' from collection name for param
    
    // Determine operation type
    let operation;
    let data;
    
    if (!change.before.exists && change.after.exists) {
      // Document was created
      operation = 'CREATE';
      data = change.after.data();
      console.log(`📝 [${database.toUpperCase()}] ${collection} created: ${docId}`);
    } else if (change.before.exists && change.after.exists) {
      // Document was updated
      operation = 'UPDATE';
      data = change.after.data();
      console.log(`📝 [${database.toUpperCase()}] ${collection} updated: ${docId}`);
    } else if (change.before.exists && !change.after.exists) {
      // Document was deleted
      operation = 'DELETE';
      data = change.before.data();
      console.log(`🗑️ [${database.toUpperCase()}] ${collection} deleted: ${docId}`);
    } else {
      // This shouldn't happen, but just in case
      console.log(`⚠️ [${database.toUpperCase()}] Unknown operation for ${collection}: ${docId}`);
      return;
    }
    
    await callWebhook(operation, data, docId, collection, database);
    console.log(`✅ [${database.toUpperCase()}] ${operation} completed for: ${docId}`);
  };
}

// =============================================================================
// DYNAMIC FUNCTION GENERATION
// =============================================================================

console.log('🏗️ Generating Firebase Functions dynamically...');

// Generate functions for each database-collection combination
DATABASES.forEach(database => {
  COLLECTIONS.forEach(collection => {
    const functionName = `${database}${collection.charAt(0).toUpperCase() + collection.slice(1)}`;
    const docPath = `${collection}/{${collection.slice(0, -1)}Id}`; // bookings/{bookingId}
    
    console.log(`🔧 Creating function: ${functionName} -> ${database}/${docPath}`);
    
    exports[functionName] = functions.firestore
      .database(database)
      .document(docPath)
      .onWrite(createDocumentHandler(database, collection));
  });
});

// =============================================================================
// HEALTH CHECK FUNCTION
// =============================================================================

exports.healthCheck = functions.https.onRequest((req, res) => {
  console.log('🔍 Health check endpoint called');
  
  // Generate list of created functions
  const generatedFunctions = [];
  DATABASES.forEach(database => {
    COLLECTIONS.forEach(collection => {
      const functionName = `${database}${collection.charAt(0).toUpperCase() + collection.slice(1)}`;
      generatedFunctions.push(functionName);
    });
  });
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    project: process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'unknown',
    configuration: {
      databases: DATABASES,
      collections: COLLECTIONS,
      webhookUrl: WEBHOOK_URL,
      hasWebhookSecret: !!WEBHOOK_SECRET
    },
    environment: {
      nodeVersion: process.version,
      gcpProject: process.env.GCP_PROJECT,
      gcloudProject: process.env.GCLOUD_PROJECT
    },
    functions: [...generatedFunctions, 'healthCheck']
  };
  
  console.log('📊 Health check response:', healthData);
  
  res.json(healthData);
});

console.log(`✅ Firebase Functions setup complete! Generated ${DATABASES.length * COLLECTIONS.length} sync functions + 1 health check function.`); 