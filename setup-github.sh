#!/bin/bash
# Setup script — run this AFTER creating the repo on GitHub
# Usage: bash setup-github.sh <github-repo-url>
# Example: bash setup-github.sh https://github.com/pagosmunnich/smart-proposal-generator.git

REPO_URL=$1

if [ -z "$REPO_URL" ]; then
  echo "Usage: bash setup-github.sh <github-repo-url>"
  echo "Example: bash setup-github.sh https://github.com/pagosmunnich/smart-proposal-generator.git"
  exit 1
fi

echo "→ Adding remote origin..."
git remote add origin $REPO_URL

echo "→ Staging all files..."
git add .

echo "→ Creating initial commit..."
git commit -m "feat: initial commit — Smart Proposal Generator"

echo "→ Renaming branch to main..."
git branch -M main

echo "→ Pushing to GitHub..."
git push -u origin main

echo "✓ Done! Your repo is live at: $REPO_URL"
echo ""
echo "Next steps:"
echo "1. Go to https://huggingface.co/new-space"
echo "2. Space name: smart-proposal-generator"
echo "3. SDK: Docker"
echo "4. Link to your GitHub repo"
echo "5. Add these Space secrets:"
echo "   - CLERK_SECRET_KEY"
echo "   - ANTHROPIC_API_KEY"
echo "   - DATABASE_URL"
echo "6. Add HF_TOKEN to GitHub repo secrets (Settings → Secrets → Actions)"
