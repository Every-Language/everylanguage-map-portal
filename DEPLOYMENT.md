# Deployment Guide

This guide will help you deploy the OMT Audio Upload Website to Vercel with automated CI/CD.

## Prerequisites

- ✅ Development Supabase project (you have this)
- ✅ Production Supabase project (you have this)
- GitHub repository
- Vercel account

## 🚀 Quick Setup Steps

### 1. GitHub Repository Setup

If you haven't already pushed to GitHub:

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit with CI/CD setup"

# Create repository on GitHub, then:
git remote add origin https://github.com/yourusername/omt-audio-upload-website.git
git branch -M main
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop
```

### 2. Vercel Project Setup

1. **Go to [vercel.com](https://vercel.com)** and sign up with GitHub
2. **Click "New Project"**
3. **Import your repository** - Select `omt-audio-upload-website`
4. **Configure project settings:**
   - Project Name: `omt-audio-upload-website`
   - Framework Preset: `Vite` (should auto-detect)
   - Root Directory: `./` (leave as default)
   - Build Command: `npm run build` (should auto-detect)
   - Output Directory: `dist` (should auto-detect)
   - Install Command: `npm install` (should auto-detect)

### 3. Environment Variables Setup

#### For Production (main branch):
Go to **Project Settings → Environment Variables** and add:

**Environment:** `Production`
```
VITE_SUPABASE_URL = https://your-prod-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = your_production_anon_key_here
NODE_ENV = production
```

#### For Development (develop branch and previews):
**Environment:** `Preview`
```
VITE_SUPABASE_URL = https://your-dev-project-id.supabase.co
VITE_SUPABASE_ANON_KEY = your_development_anon_key_here
NODE_ENV = development
```

### 4. Branch Configuration

In Vercel **Project Settings → Git**:

1. **Production Branch:** Set to `main`
2. **Deploy Hooks:** Enable for both branches
3. **Automatic deployments from Git:** Enable

### 5. Custom Domains (Optional)

In **Project Settings → Domains**:
1. Add your production domain (e.g., `yourapp.com`)
2. Add development subdomain (e.g., `dev.yourapp.com` pointed to develop branch)

## 🔄 Deployment Workflow

### Branch Strategy:
- **`main` branch** → Production deployment (`yourapp.vercel.app`)
- **`develop` branch** → Development deployment (`dev-yourapp.vercel.app`)
- **Feature branches** → Preview deployments (unique URLs)

### Automated CI/CD Process:
1. **Push to any branch** → GitHub Actions runs tests
2. **Tests pass** → Vercel automatically deploys
3. **Main branch** → Deploys to production
4. **Develop branch** → Deploys to development
5. **Pull requests** → Creates preview deployments

## 🛡️ Security & Best Practices

### Environment Variables Security:
- ✅ Never commit `.env` files
- ✅ Use different Supabase projects for dev/prod
- ✅ Rotate API keys regularly
- ✅ Use Row Level Security (RLS) in Supabase

### Branch Protection (Recommended):
1. Go to GitHub → Settings → Branches
2. Add protection rule for `main` branch:
   - Require PR reviews
   - Require status checks (CI must pass)
   - Require branches to be up to date

## 📊 Monitoring & Maintenance

### Vercel Dashboard:
- Monitor deployment status
- View build logs
- Check performance metrics
- Review error logs

### GitHub Actions:
- View CI/CD pipeline status
- Monitor test results
- Check security scans

## 🚨 Troubleshooting

### Common Issues:

1. **Build fails with Supabase connection error:**
   - Check environment variables are set correctly
   - Verify Supabase URLs and keys

2. **TypeScript errors in CI:**
   - Run `npm run lint` and `npx tsc --noEmit` locally first

3. **Tests failing:**
   - Ensure all tests pass locally with `npm run test:run`

4. **Deployment not triggering:**
   - Check Vercel Git integration settings
   - Verify webhook configuration

### Support:
- Vercel docs: https://vercel.com/docs
- GitHub Actions docs: https://docs.github.com/en/actions

## 🎯 What Happens Next

1. **Push changes** → CI runs automatically
2. **Merge to develop** → Development site updates
3. **Merge to main** → Production site updates
4. **PR creation** → Preview deployment created

Your deployment is now fully automated! 🎉 