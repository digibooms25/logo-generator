# Environment Setup Guide

This guide explains how to set up environment variables for the AI Logo Generator application.

## Quick Start

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual API keys and configuration

3. Start the development server:
   ```bash
   npm run dev
   ```

## Required Environment Variables

### Flux Kontext Pro API Key

**Variable:** `FLUX_KONTEXT_PRO_API_KEY`  
**Required:** Yes  
**Description:** API key for Flux Kontext Pro image generation service

**How to get:**

1. Visit [https://api.bfl.ai/](https://api.bfl.ai/)
2. Sign up for an account
3. Navigate to your API dashboard
4. Generate a new API key
5. Copy the key to your `.env.local` file

### LLM API Key (Choose One)

At least one of the following LLM providers is required:

#### OpenAI (Recommended)

**Variable:** `OPENAI_API_KEY`  
**Model:** `gpt-4o-mini` (cost-effective)  
**Description:** For business information extraction from user input

**How to get:**

1. Visit [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env.local` file

#### Alternative: Anthropic Claude

**Variable:** `ANTHROPIC_API_KEY`  
**Model:** `claude-3-haiku-20240307`

#### Alternative: Google AI

**Variable:** `GOOGLE_AI_API_KEY`  
**Model:** `gemini-pro`

### Admin Password

**Variable:** `ADMIN_PASSWORD`  
**Required:** Yes  
**Description:** Simple password protection for the admin panel

**Setup:**
Choose a secure password for accessing the admin panel where you can upload logos and manage the gallery.

## Optional Configuration

### Upload Settings

```bash
# Maximum file size in MB (default: 10)
MAX_FILE_SIZE_MB=10

# Allowed file types (default: jpg,jpeg,png,svg,webp)
ALLOWED_FILE_TYPES=jpg,jpeg,png,svg,webp
```

### Application Settings

```bash
# Application URL (default: http://localhost:3000)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment (default: development)
NODE_ENV=development
```

## Example Configuration

Here's a complete example of a `.env.local` file:

```bash
# Required API Keys
FLUX_KONTEXT_PRO_API_KEY=bfl_1234567890abcdef
OPENAI_API_KEY=sk-1234567890abcdef
ADMIN_PASSWORD=my_secure_admin_password_123

# Optional Settings (these are the defaults)
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=jpg,jpeg,png,svg,webp
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Validation

The application will automatically validate your environment variables on startup:

1. **Missing required variables:** The app will throw an error and refuse to start
2. **Missing LLM provider:** At least one LLM API key must be provided
3. **Invalid file size:** MAX_FILE_SIZE_MB must be a positive number

## Security Notes

- **Never commit `.env.local`** - it's automatically ignored by git
- **Use strong passwords** for admin access
- **Rotate API keys** regularly for security
- **Use environment-specific files** (`.env.development`, `.env.production`) for different environments

## Troubleshooting

### "Missing required environment variables" error

- Check that all required variables are set in your `.env.local` file
- Ensure there are no typos in variable names
- Restart the development server after making changes

### "No LLM provider available" error

- Ensure at least one LLM API key is provided and valid
- Check that the API key format is correct
- Verify your API key has sufficient credits/quota

### File upload issues

- Check `MAX_FILE_SIZE_MB` is reasonable (recommend 10MB or less)
- Verify `ALLOWED_FILE_TYPES` includes the file types you want to support
- Ensure the file types are comma-separated without spaces
