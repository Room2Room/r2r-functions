#!/bin/bash

# R2R Firebase Functions Deployment Script
# Usage: ./deploy.sh [dev|prod]

set -e  # Exit on any error

ENVIRONMENT=${1:-dev}

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Invalid environment. Use: ./deploy.sh [dev|prod]"
    exit 1
fi

echo "🚀 Deploying Firebase Functions to $ENVIRONMENT..."

# Switch to the correct project
echo "📍 Switching to $ENVIRONMENT project..."
firebase use $ENVIRONMENT

# Show current configuration
echo "📋 Current configuration:"
firebase functions:config:get

# Install dependencies
echo "📦 Installing dependencies..."
cd functions
npm install
cd ..

# Deploy functions
echo "🚀 Deploying functions..."
firebase deploy --only functions

# Show deployed functions
echo "✅ Deployment complete! Functions available at:"
if [ "$ENVIRONMENT" == "prod" ]; then
    PROJECT_ID="r2r-prod"
else
    PROJECT_ID="r2r-dev"
fi

echo "🔗 Health Check: https://us-central1-$PROJECT_ID.cloudfunctions.net/healthCheck"
echo "📊 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/functions"

echo ""
echo "🎉 Deployment to $ENVIRONMENT completed successfully!" 