#!/bin/bash

# Script to set up and deploy the Adventure Time Forum

echo "========================================"
echo "Adventure Time Forum Deployment Helper"
echo "========================================"

function setup_local() {
    echo "Setting up local development environment..."
    
    # Create the NGINX config directory
    mkdir -p nginx
    
    # Create default.conf for NGINX
    cat > nginx/default.conf << 'EOF'
# NGINX configuration file for API Gateway

server {
    listen 80;
    server_name localhost;

    # API Gateway
    location /api/users {
        proxy_pass http://users:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/threads {
        proxy_pass http://threads:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/posts {
        proxy_pass http://posts:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/auth {
        proxy_pass http://auth:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/notifications {
        proxy_pass http://notifications:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/search {
        proxy_pass http://search:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Default route
    location / {
        return 200 'Adventure Time Forum API';
        add_header Content-Type text/plain;
    }
}
EOF

    # Create directories for new services
    mkdir -p auth notifications search
    
    # Set up auth service
    echo "Setting up auth service..."
    # Create files for auth service

    # Set up notifications service
    echo "Setting up notifications service..."
    # Create files for notifications service
    
    # Set up search service
    echo "Setting up search service..."
    # Create files for search service
    
    echo "Starting Docker Compose..."
    docker-compose up -d
    
    echo "Local setup complete!"
    echo "Your services are available at:"
    echo "- Users: http://localhost:3001/api/users"
    echo "- Threads: http://localhost:3002/api/threads"
    echo "- Posts: http://localhost:3003/api/posts"
    echo "- Auth: http://localhost:3004/api/auth"
    echo "- Notifications: http://localhost:3005/api/notifications"
    echo "- Search: http://localhost:3006/api/search"
    echo "- API Gateway: http://localhost/api/"
}

function deploy_aws() {
    echo "Preparing for AWS deployment..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    # Check if Copilot is installed
    if ! command -v copilot &> /dev/null; then
        echo "AWS Copilot CLI not found. Would you like to install it? (y/n)"
        read -r install_copilot
        if [[ $install_copilot == "y" ]]; then
            # Install Copilot
            curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
            chmod +x copilot
            sudo mv copilot /usr/local/bin/copilot
        else
            echo "Please install AWS Copilot manually and run this script again."
            exit 1
        fi
    fi
    
    # Initialize Copilot application
    echo "Initializing Copilot application..."
    copilot init --app adventure-time-forum
    
    # Create environments
    echo "Creating dev environment..."
    copilot env init --name dev --profile default --app adventure-time-forum
    
    echo "Creating prod environment..."
    copilot env init --name prod --profile default --app adventure-time-forum
    
    # Deploy each service
    services=("users" "threads" "posts" "auth" "notifications" "search")
    
    for service in "${services[@]}"; do
        echo "Deploying $service service..."
        cd "./$service" || exit
        copilot svc init --name "$service" --svc-type "Load Balanced Web Service" --dockerfile "./Dockerfile" --port 3000
        
        # If it's the auth service, we need to set up a secure parameter
        if [[ $service == "auth" ]]; then
            # Generate a random JWT secret
            JWT_SECRET=$(openssl rand -hex 32)
            
            # Store it in Parameter Store
            aws ssm put-parameter --name "/adventure-time-forum/dev/secrets/jwt-secret" --value "$JWT_SECRET" --type SecureString
            aws ssm put-parameter --name "/adventure-time-forum/prod/secrets/jwt-secret" --value "$JWT_SECRET" --type SecureString
            
            # Update the manifest to use the secret
            copilot svc update --name auth
            echo "Don't forget to add the JWT_SECRET parameter to the auth service manifest!"
        fi
        
        # Deploy to dev
        copilot svc deploy --name "$service" --env dev
        
        cd ..
    done
    
    echo "AWS deployment to dev complete!"
    echo "To deploy to production, use:"
    echo "copilot svc deploy --name SERVICE_NAME --env prod"
}

# Main menu
echo "What would you like to do?"
echo "1) Set up local development environment with Docker Compose"
echo "2) Deploy to AWS ECS with Copilot"
echo "3) Exit"
read -r choice

case $choice in
    1) setup_local ;;
    2) deploy_aws ;;
    3) exit 0 ;;
    *) echo "Invalid choice" ;;
esac
