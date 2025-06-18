# R2R Firebase Functions - Search Sync

Syncs Firestore changes to Meilisearch via webhooks. Functions are dynamically generated from arrays:

```javascript
const DATABASES = ['auburn', 'oxford'];
const COLLECTIONS = ['bookings'];
```

## Quick Commands

### Environment Setup
```bash
# Switch environments
firebase use dev
firebase use prod

# Set config
firebase functions:config:set webhook.url="https://api.dev.r2rmovers.com/api/MeilisearchWebhook" webhook.secret="your-secret"

# Get config
firebase functions:config:get

# Install deps
cd functions && npm install
```

### Deploy
```bash
# Quick deploy
./deploy.sh dev
./deploy.sh prod

# Manual deploy
firebase use dev && firebase deploy --only functions
firebase use prod && firebase deploy --only functions
```

### Development
```bash
# Local emulator
firebase emulators:start --only functions

# View logs
firebase functions:log
firebase functions:log --only auburnBookings

# Health check
curl https://us-central1-r2r-dev.cloudfunctions.net/healthCheck
```

## Adding Databases/Collections

Update arrays in `functions/index.js`:
```javascript
const DATABASES = ['auburn', 'oxford', 'atlanta'];  // Adds atlantaBookings
const COLLECTIONS = ['bookings', 'contacts'];       // Adds auburnContacts, oxfordContacts
```

## Webhook Payload
```json
{
  "operation": "CREATE|UPDATE|DELETE",
  "data": { /* document data */ },
  "id": "document-id",
  "collection": "bookings", 
  "campus": "auburn|oxford",
  "secret": "webhook-secret"
}
``` 