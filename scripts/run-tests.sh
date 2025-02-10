#!/bin/bash

# Lade lokale Umgebungsvariablen, falls vorhanden
if [ -f .env.local ]; then
    echo "Lade .env.local..."
    set -a
    source .env.local
    set +a
fi

# Lade Test-Umgebungsvariablen
echo "Lade .env.test..."
set -a
source .env.test
set +a

# Setze Standard-Werte für fehlende Variablen
export REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
export PINECONE_ENVIRONMENT=${PINECONE_ENVIRONMENT:-"europe-west4"}
export PINECONE_INDEX=${PINECONE_INDEX:-"dialog-engine"}

# Prüfe ob kritische API Keys gesetzt sind
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY ist nicht gesetzt"
    exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
    echo "Error: PINECONE_API_KEY ist nicht gesetzt"
    exit 1
fi

if [ -z "$FIRECRAWL_API_KEY" ]; then
    echo "Error: FIRECRAWL_API_KEY ist nicht gesetzt"
    exit 1
fi

# Zeige Konfiguration
echo "Test-Konfiguration:"
echo "REDIS_URL: $REDIS_URL"
echo "PINECONE_ENVIRONMENT: $PINECONE_ENVIRONMENT"
echo "PINECONE_INDEX: $PINECONE_INDEX"
echo "TEST_TEMPLATE_ID: $TEST_TEMPLATE_ID"
echo "TEST_URL: $TEST_URL"

# Führe Tests aus
echo -e "\nStarte System Integration Tests..."
npm test tests/integration/system.test.ts 