# Product Requirements Document: Audio Upload Website

## Overview

A high-performance, user-friendly web application for uploading and managing audio Bible recordings with integrated text and verse timing capabilities.

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS (fast, utility-first)
- **State Management**: Zustand (lightweight, performant)
- **API**: tanstack query
- **UI Components**: Headless UI + Radix UI primitives
- **Audio Processing**: Web Audio API + ffmpeg.wasm (for metadata extraction)
- **File Upload**: Direct multipart upload with progress tracking
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (optimal for React apps)

## Core Features

### 1. Authentication & User Management

- **Login Flow**: Supabase Auth integration
- **User Session**: Persistent authentication state
- **Authorization**: Role-based access control

### 2. Project Management

- **Project Creation**: Hierarchical language and region selection
- **Project Dashboard**: Overview of upload progress and statistics
- **Project Settings**: Metadata editing capabilities

### 3. Audio Upload & Processing

- **Drag & Drop Interface**: Multi-file upload with preview
- **Automatic Detection**: Bible book, chapter, verse extraction from filenames
- **Metadata Extraction**: ID3 verse timing information
- **Progress Tracking**: Real-time upload progress and processing status

### 4. Verse Timing & Marking

- **Audio Player**: Custom player with precise timestamp controls
- **Verse Marking**: Click-to-mark verse boundaries
- **Timeline Editor**: Visual representation of verse segments
- **Validation**: Ensure complete chapter coverage

### 5. Text Upload & Management

- **CSV Import**: Bulk verse text upload
- **Text Version Management**: Multiple translations per project
- **Verse Linking**: Automatic association with audio timings

## User Flows

### Flow 1: Login

1. User lands on login page
2. Authenticates via Supabase Auth (email/password, OAuth)
3. Redirects to project dashboard

### Flow 2: Project Creation

1. **Language Selection**
   - Hierarchical tree view of language_entities
   - Collapsible parent-child relationships
   - Search functionality for quick navigation
   - Select target language entity

2. **Project Setup**
   - Form with auto-populated fields:
     - Name (required)
     - Description (optional)
     - Source language (dropdown)
     - Region (hierarchical selection)
     - Location (auto-detected with user permission)
     - Created_by, created_at, updated_at (auto-filled)

3. **Project Creation**
   - Validation and database insertion
   - Redirect to project dashboard

### Flow 3: Project Dashboard

1. **Bible Book List**
   - Expandable/collapsible book entries
   - Chapter status indicators:
     - 🟢 Green: Fully uploaded (all verses covered)
     - 🟠 Orange: Partially uploaded (some verses missing)
     - 🔴 Red: Not started (no uploads)
   - Verse range display per chapter
   - Progress calculation based on media_files coverage

2. **Chapter Expansion**
   - Show media_files for each chapter
   - Display verse coverage and gaps
   - Quick access to re-upload or edit

3. **Action Buttons**
   - "Upload Audio Files" (primary CTA)
   - "Upload Text" (secondary)
   - "Edit Project" (settings)

### Flow 4: Audio File Upload

1. **File Selection**
   - Drag & drop zone supporting multiple files
   - File type validation (mp3, m4a, wav, etc.)
   - File size and format checks

2. **Automatic Detection**
   - **Filename Parsing**: RegEx patterns for:
     - `Language_Book_Chapter###_V###_###.mp3`
     - `Language_Book_Chapter#.zip`
     - Custom patterns with fallback manual entry
   - **Metadata Extraction**:
     - Use ffmpeg.wasm to extract ID3 tags
     - Parse CHAPTER#START/END/NAME/ID format
     - Convert timestamps to seconds

3. **Upload Review**
   - Table view of detected files with:
     - Filename
     - Detected book/chapter (editable dropdown)
     - Verse range (auto-detected or manual)
     - Duration
     - Status (valid/needs attention)
   - Validation warnings for missing data
   - "Mark Verses" button for detailed timing

4. **Batch Upload**
   - Progress tracking per file
   - Error handling and retry logic
   - Database insertion via Supabase Edge Function

### Flow 5: Verse Marking (Modal)

1. **Audio Player**
   - Custom HTML5 audio player
   - Controls: Play/pause, skip ±5s, speed (0.5x-4x)
   - Waveform visualization (optional)
   - Current timestamp display

2. **Verse List**
   - Chronologically ordered marked verses
   - Editable start times (with auto-reorder)
   - Calculated verse numbers (incremental)
   - Delete functionality
   - Validation against chapter.total_verses

3. **Marking Interface**
   - "Mark Verse" button adds verse at current timestamp
   - Visual timeline with verse markers
   - Keyboard shortcuts (spacebar, arrow keys)

4. **Save & Exit**
   - Validation checks
   - Save to component state
   - Close modal

### Flow 6: Text Upload

1. **Text Version Setup**
   - Input field for text version name
   - Bible version dropdown (from bible_versions table)
   - Validation for required fields

2. **CSV Upload**
   - File upload component
   - CSV parsing with validation
   - Expected format: verse_reference, verse_text
   - Error handling for malformed data

3. **Data Preview**
   - Table displaying parsed data
   - Highlighting for unrecognized verses
   - Statistics: total rows, valid verses, errors
   - Edit functionality for corrections

4. **Confirmation & Save**
   - Final validation
   - Database transactions:
     - Insert text_versions record
     - Insert verse_texts records
     - Update media_files_verses.verse_text_id
   - Success confirmation

## Database Schema Integration

### Key Tables Used:

- `projects` - Project metadata
- `language_entities` - Hierarchical language structure
- `regions` - Hierarchical region structure
- `bible_versions` - Bible version references
- `books` - Bible book structure
- `chapters` - Chapter information with verse counts
- `verses` - Individual verse records
- `media_files` - Audio file metadata
- `media_files_verses` - Verse timing information
- `media_files_targets` - Chapter associations
- `text_versions` - Text version metadata
- `verse_texts` - Verse text content

### API Endpoints (Supabase Edge Functions):

- `upload_audio` - Handles audio file upload and processing
- `create_project` - Project creation with validation
- `extract_metadata` - Audio metadata extraction
- `bulk_text_upload` - CSV text processing

## Performance Requirements

- **File Upload**: Concurrent uploads with progress tracking
- **Metadata Extraction**: Client-side processing to reduce server load
- **Real-time Updates**: Supabase subscriptions for live status updates
- **Caching**: Aggressive caching for language/region hierarchies
- **Lazy Loading**: Pagination for large datasets

## User Experience Priorities

1. **Simplicity**: Minimal clicks to complete tasks
2. **Visual Feedback**: Clear progress indicators and status updates
3. **Error Prevention**: Validation at each step
4. **Responsive Design**: Mobile-friendly interface
5. **Accessibility**: WCAG 2.1 AA compliance

## Security Considerations

- **Authentication**: Supabase RLS policies
- **File Validation**: Client and server-side validation
- **Upload Limits**: File size and quantity restrictions
- **Data Sanitization**: Input validation and sanitization
- **CORS**: Proper cross-origin resource sharing

## Success Metrics

- **Upload Success Rate**: >99% successful uploads
- **Time to Upload**: <30 seconds for typical audio file
- **User Completion Rate**: >90% complete their upload workflow
- **Error Rate**: <1% unrecoverable errors
- **Performance**: Page load times <2 seconds

## Future Enhancements

- **Batch Operations**: Bulk chapter management
- **Audio Visualization**: Waveform display in verse marker
- **Collaboration**: Multi-user project access
- **Export Features**: Various format exports
- **Quality Assurance**: Automated audio quality checks
