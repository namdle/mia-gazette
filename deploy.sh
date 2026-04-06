#!/bin/bash
# Deploy latest code to Unraid and restart the container.
# Usage: ./deploy.sh
set -e

if [ ! -f .deploy-config ]; then
  echo "Error: .deploy-config not found. Copy .deploy-config.example and fill in your values."
  exit 1
fi

source .deploy-config

echo "Pushing to GitHub..."
git push

echo "Deploying to $NAS_HOST..."
ssh root@"$NAS_HOST" "
  cd $NAS_DEPLOY_PATH &&
  git pull &&
  docker stop mia-gazette &&
  docker rm mia-gazette &&
  docker build -t mia-gazette . &&
  docker run -d --name mia-gazette --restart unless-stopped -p 3005:3000 \
    -v $NAS_DEPLOY_PATH/content/articles:/app/content/articles:ro \
    -v $NAS_DEPLOY_PATH/public/images:/app/public/images:ro \
    mia-gazette
"

echo "Done! https://paper.miale13.com"
