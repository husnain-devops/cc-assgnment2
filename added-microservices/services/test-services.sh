#!/bin/bash

echo "Testing search service connectivity..."
echo "----------------------------------------"

# Get the actual search container ID
SEARCH_CONTAINER=$(docker ps | grep search | awk '{print $1}')

if [ -z "$SEARCH_CONTAINER" ]; then
  echo "Error: Could not find search container"
  exit 1
fi

echo "Found search container: $SEARCH_CONTAINER"
echo

# Test connectivity to each service from within the search container
echo "Testing connection to posts service:"
docker exec $SEARCH_CONTAINER sh -c "wget -T 2 -O- http://posts:3000/api/ 2>/dev/null || echo 'Connection failed'"
echo

echo "Testing connection to users service:"
docker exec $SEARCH_CONTAINER sh -c "wget -T 2 -O- http://users:3000/api/ 2>/dev/null || echo 'Connection failed'"
echo

echo "Testing connection to threads service:"
docker exec $SEARCH_CONTAINER sh -c "wget -T 2 -O- http://threads:3000/api/ 2>/dev/null || echo 'Connection failed'"
echo

# Try alternative naming conventions
echo "Testing connection with services- prefix:"
docker exec $SEARCH_CONTAINER sh -c "wget -T 2 -O- http://services-posts:3000/api/ 2>/dev/null || echo 'Connection failed'"
echo

# List all network aliases that might be available to the container
echo "Listing network info:"
docker inspect $SEARCH_CONTAINER | grep -A 20 "Networks"
echo

echo "Listing all containers on network:"
NETWORK=$(docker inspect $SEARCH_CONTAINER -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
docker network inspect $NETWORK | grep -A 50 "Containers"
