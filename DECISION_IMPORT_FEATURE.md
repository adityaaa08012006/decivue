# Decision Import Feature - Installation Guide

## Overview
This document outlines the implementation of the **Decision Import** feature, which allows users to upload documents and extract decisions automatically using AI or import from structured templates.

## Features Implemented

### 1. **Frontend Components**
- ✅ `ImportDecisionsModal.jsx` - Modal with two tabs:
  - **AI Extraction**: Upload PDF, TXT, MD, or DOCX files
  - **Template Import**: Upload CSV/Excel files
- ✅ Preview and edit extracted decisions before importing
- ✅ Bulk decision creation with automatic assumption linking

### 2. **Backend API Endpoints**
- ✅ `POST /api/decisions/import/parse` - AI-powered document extraction
- ✅ `POST /api/decisions/import/template` - Template-based CSV parsing
- ✅ `POST /api/decisions/import/bulk` - Bulk decision creation

### 3. **AI Integration**
- ✅ Uses Google Gemini AI (already configured in your project)
- ✅ Fallback extraction when AI is unavailable
- ✅ Structured prompt for decision extraction

## Required Package Installation

Run the following command in the `backend/` directory:

```bash
cd backend
npm install multer @types/multer pdf-parse mammoth csv-parse
```

### Package Details:
- **multer** (`^1.4.5-lts.1`): File upload middleware for Express
- **@types/multer** (`^1.4.11`): TypeScript definitions for multer
- **pdf-parse** (`^1.1.1`): Extract text from PDF files
- **mammoth** (`^1.7.2`): Extract text from DOCX files
- **csv-parse** (`^5.5.3`): Parse CSV files

## Environment Variables

Make sure your `.env` file has the Gemini API key (already configured):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

If not set, the feature will use fallback extraction (simple keyword detection).

## File Upload Limits

The feature is configured with the following limits:
- **Max file size**: 10 MB
- **Supported formats**:
  - **AI Extraction**: PDF, TXT, MD, DOCX
  - **Template Import**: CSV, XLSX, XLS

## How It Works

### AI Extraction Flow

1. User uploads a document (PDF/TXT/MD/DOCX)
2. Backend extracts text from the document
3. Text is sent to Gemini AI with a structured prompt
4. AI returns JSON array of extracted decisions with:
   - Title
   - Description
   - Category (Strategic Initiative | Budget & Financial | Technical | Policy | Operational)
   - Assumptions (array)
   - Confidence score (0-100)
5. User reviews and edits in preview modal
6. Bulk import creates decisions and links assumptions

### Template Import Flow

1. User downloads CSV template
2. Fills in decision data:
   - `title`, `description`, `category`
   - `assumptions` (semicolon-separated)
   - `constraints` (semicolon-separated)
   - `expiryDate` (YYYY-MM-DD)
3. Uploads completed template
4. Backend parses CSV rows
5. User reviews in preview modal
6. Bulk import creates decisions

### Assumption Deduplication

The system automatically:
- Checks if an assumption already exists (by description)
- Reuses existing assumptions instead of creating duplicates
- Links assumptions to multiple decisions when applicable

## Usage

### From the Dashboard

1. Click the **"Import from Document"** button (top right, indigo color)
2. Choose a tab:
   - **AI Extraction**: Drag-drop or select a document
   - **Template Import**: Download template, fill it, upload
3. Click **"Extract with AI"** or **"Parse Template"**
4. Review extracted decisions:
   - Edit titles, descriptions, categories
   - Add/remove assumptions
   - Remove unwanted decisions
5. Click **"Import X Decisions"**
6. Success! Decisions are created and appear in the monitoring dashboard

## CSV Template Format

```csv
title,description,category,assumptions,constraints,expiryDate
"Migrate to Cloud Infrastructure","Move from on-premise to AWS cloud services","Technical Initiative","AWS pricing stable;Team has cloud skills","Budget: $500k max","2026-12-31"
"Increase Marketing Budget","Allocate $200k for Q2 campaigns","Budget & Financial","Market conditions favorable;ROI target 3x","Budget Policy","2026-06-30"
```

**Note**: Use semicolons (`;`) to separate multiple assumptions or constraints.

## Error Handling

The feature includes comprehensive error handling:
- **File validation**: Type and size checks
- **AI failures**: Falls back to keyword extraction
- **Duplicate detection**: Prevents duplicate assumptions
- **Partial imports**: Shows which decisions succeeded/failed
- **User feedback**: Toast notifications for success/error states

## AI Prompt Engineering

The AI extraction uses a carefully crafted prompt to ensure quality:

```
You are a decision analysis assistant. Extract explicit decisions from this document.

Return ONLY a valid JSON array with this exact schema (no markdown, no code blocks):
[{
  "title": "Clear decision title",
  "description": "Full context and rationale",
  "category": "Strategic Initiative|Budget & Financial|Technical Initiative|Policy & Compliance|Operational",
  "assumptions": ["assumption 1", "assumption 2"],
  "confidence": 85
}]

Rules:
- Only extract explicit decisions, not suggestions or discussions
- Be concise but informative
- Include 2-5 underlying assumptions per decision
- Confidence is 0-100 (how certain you are this is a real decision)
- Return empty array [] if no decisions found
```

## Security Considerations

- ✅ File type validation (MIME type + extension check)
- ✅ File size limits (10MB max)
- ✅ Memory-based storage (files not saved to disk)
- ✅ Organization-scoped decisions (multi-tenant support)
- ✅ Authentication required for all endpoints

## Next Steps (Optional Enhancements)

1. **OCR Support**: Add Tesseract.js for scanned PDFs
2. **Batch Upload**: Support multiple files at once
3. **Google Docs Integration**: Direct import from Google Drive
4. **Template Learning**: Save user corrections to improve AI
5. **Conflict Detection**: Warn about potential decision conflicts before import
6. **Virus Scanning**: Integrate ClamAV for uploaded files

## Testing the Feature

1. **Install packages**: `npm install` in backend
2. **Start backend**: `npm run dev`
3. **Start frontend**: `cd ../frontend && npm run dev`
4. **Test AI extraction**:
   - Create a text file with decision descriptions
   - Upload it via the Import modal
   - Verify AI extracts decisions correctly
5. **Test template import**:
   - Download the CSV template
   - Add a few decisions
   - Upload and verify parsing

## Troubleshooting

### "pdf-parse not installed" error
```bash
cd backend
npm install pdf-parse
```

### "mammoth not installed" error
```bash
cd backend
npm install mammoth
```

### "csv-parse not installed" error
```bash
cd backend
npm install csv-parse
```

### AI extraction returns empty array
- Check `GEMINI_API_KEY` in `.env`
- Verify document has clear decision language
- Try the fallback extraction (should work without AI)

### Multer file upload errors
```bash
npm install multer @types/multer
```

## Technical Architecture

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │ FormData (file)
         ↓
┌─────────────────────────┐
│ ImportDecisionsModal.jsx│
└────────┬────────────────┘
         │ POST /api/decisions/import/parse
         ↓
┌─────────────────────────┐
│  Multer Middleware      │ ← File upload handling
└────────┬────────────────┘
         │ req.file.buffer
         ↓
┌─────────────────────────┐
│  Import Controller      │
│  - extractFromPDF()     │ ← pdf-parse
│  - extractFromDOCX()    │ ← mammoth
│  - extractDecisionsAI() │ ← Gemini AI
└────────┬────────────────┘
         │ JSON response
         ↓
┌─────────────────────────┐
│  Preview & Validation   │ ← User edits
└────────┬────────────────┘
         │ POST /api/decisions/import/bulk
         ↓
┌─────────────────────────┐
│  Bulk Import Service    │
│  - Create decisions     │
│  - Deduplicate assumes  │
│  - Link relationships   │
└────────┬────────────────┘
         │ Success/Failure results
         ↓
┌─────────────────────────┐
│  Dashboard Refresh      │ ← Toast notification
└─────────────────────────┘
```

## Files Modified/Created

### Frontend
- ✅ Created: `frontend/src/components/ImportDecisionsModal.jsx`
- ✅ Modified: `frontend/src/components/DecisionMonitoring.jsx`
- ✅ Modified: `frontend/src/services/api.js`

### Backend
- ✅ Created: `backend/src/api/controllers/import-controller.ts`
- ✅ Modified: `backend/src/api/routes/decisions.ts`

---

**Status**: ✅ Feature complete and ready for testing!

**Install packages and restart the backend to enable the feature.**
