#!/bin/bash

BASE_URL="http://172.31.40.167"
AUTH_URL="$BASE_URL:3004/api/auth"
NOTIF_URL="$BASE_URL:3005/api/notifications"
SEARCH_URL="$BASE_URL:3006/api/search"
POSTS_URL="$BASE_URL/api/posts"

echo "Logging in..."
TOKEN=$(curl -s -X POST "$AUTH_URL/login" -H "Content-Type: application/json" -d '{"username":"iceking","password":"penguin123"}' | jq -r '.token')

echo "Verifying token..."
curl -X GET "$AUTH_URL/verify" -H "Authorization: Bearer $TOKEN"

echo "Logging out..."
curl -X POST "$AUTH_URL/logout" -H "Authorization: Bearer $TOKEN"

echo "Creating a notification..."
curl -X POST "$NOTIF_URL" -H "Content-Type: application/json" -d '{"userId":2,"type":"mention","sourceId":1,"threadId":3,"message":"Marceline mentioned you in a thread"}'

echo "Marking notification as read..."
curl -X PUT "$NOTIF_URL/1/read"

echo "Deleting notification..."
curl -X DELETE "$NOTIF_URL/1"

echo "Searching for 'guitar'..."
curl -X GET "$SEARCH_URL?q=guitar"

echo "Searching for 'candy' in posts..."
curl -X GET "$SEARCH_URL?q=candy&type=posts"

echo "Rebuilding search indices..."
curl -X POST "$SEARCH_URL/index"

echo "Fetching all posts..."
curl -X GET "$POSTS_URL"

echo "Test script completed."

