# Deployment Guide — GitHub + Hugging Face Spaces

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `smart-proposal-generator`
3. Set to **Public** (required for free HF Spaces sync)
4. Do NOT initialize with README (we have one)
5. Click **Create repository**
6. Copy the repository URL (e.g. https://github.com/pagosmunnich/smart-proposal-generator.git)

## Step 2: Push code to GitHub

Run in terminal:
```bash
bash setup-github.sh https://github.com/pagosmunnich/smart-proposal-generator.git
```

## Step 3: Create Hugging Face Space

1. Go to https://huggingface.co/new-space
2. **Owner**: pagosmunnich
3. **Space name**: smart-proposal-generator
4. **License**: MIT
5. **SDK**: Docker
6. **Hardware**: CPU basic (free)
7. Click **Create Space**

## Step 4: Link GitHub to HF Space

In your HF Space → Settings → **GitHub Actions** → Enable sync from GitHub.

OR the workflow in `.github/workflows/hf-sync.yml` does it automatically on push.

## Step 5: Add Secrets to HF Space

In HF Space → Settings → **Variables and Secrets** → New Secret:

| Name | Value |
|------|-------|
| `CLERK_SECRET_KEY` | sk_test_aPZqdQ1... |
| `ANTHROPIC_API_KEY` | sk-ant-api03-... |
| `DATABASE_URL` | postgresql://... (your Supabase URL) |

## Step 6: Add HF_TOKEN to GitHub

1. Go to https://huggingface.co/settings/tokens
2. Create a new token with **write** access
3. Go to your GitHub repo → Settings → Secrets → Actions → New secret
4. Name: `HF_TOKEN`, Value: your HF token

After pushing to `main`, the GitHub Action syncs to HF Spaces automatically and Docker build starts (~5-10 min).
