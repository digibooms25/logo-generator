# Project Structure

This directory contains the main source code for the AI Logo Generator application.

## Directory Organization

### `/app`

Next.js 13+ app directory containing pages, layouts, and route handlers.

### `/components`

Reusable React components organized by feature:

- `LogoGallery` - Gallery browsing interface
- `AdminPanel` - Admin management interface
- `LogoCreationWizard` - Step-by-step creation workflow
- `LogoEditor` - Logo editing interface

### `/services`

Business logic and external API integrations:

- `flux-integration` - Flux Kontext Pro API integration
- `llm-integration` - LLM API for business information extraction
- `file-upload` - File handling for admin uploads
- `local-storage` - Local data management
- `natural-language-parser` - NLP for editing commands
- `logo-variations` - Logo variation generation

### `/utils`

Utility functions and helpers:

- `export-handler` - Logo export functionality

### `/types`

TypeScript type definitions:

- `logo` - Logo data structures and interfaces

### `/hooks`

Custom React hooks:

- `useLogoGeneration` - Logo generation state management

### `/lib`

Configuration and library setup:

- `config` - API keys and application configuration

## Import Conventions

Use absolute imports with the `@/` alias:

```typescript
import { LogoGallery } from '@/components';
import { fluxApi } from '@/services';
import { Logo } from '@/types';
```
