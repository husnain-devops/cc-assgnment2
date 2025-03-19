#!/bin/bash

echo "Testing Users Service..."
USERS_RESPONSE=$(curl -s http://localhost:3000/api/users)
echo $USERS_RESPONSE | grep -q "marceline" && echo "✓ Users service responding properly" || echo "✗ Users service test failed"

echo "Testing Auth Service..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"finn","password":"adventure123"}')
TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✓ Authentication successful, token received"
else
  echo "✗ Authentication failed"
  exit 1
fi

echo "Testing Threads Service..."
THREADS_RESPONSE=$(curl -s http://localhost:3000/api/threads)
echo $THREADS_RESPONSE | grep -q "candy kingdom" && echo "✓ Threads service responding properly" || echo "✗ Threads service test failed"

echo "Testing Posts Service..."
POSTS_RESPONSE=$(curl -s http://localhost:3000/api/posts/in-thread/1)
echo $POSTS_RESPONSE | grep -q "lich" && echo "✓ Posts service responding properly" || echo "✗ Posts service test failed"

echo "Testing Notifications Service..."
NOTIF_RESPONSE=$(curl -s http://localhost:3000/api/notifications/user/2)
echo $NOTIF_RESPONSE | grep -q "message" && echo "✓ Notifications service responding properly" || echo "✗ Notifications service test failed"

echo "Testing Search Service..."
SEARCH_RESPONSE=$(curl -s "http://localhost:3000/api/search?q=guitar")
echo $SEARCH_RESPONSE | grep -q "score" && echo "✓ Search service responding properly" || echo "✗ Search service test failed"

echo "All tests completed."
