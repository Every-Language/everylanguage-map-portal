import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'

export type TextVersion = TableRow<'text_versions'>
export type VerseText = TableRow<'verse_texts'>

// TEXT VERSION HOOKS
// Hook to fetch all text versions
export function useTextVersions() {
  return useFetchCollection('text_versions', {
    orderBy: { column: 'created_at', ascending: false }
  })
}

// Hook to fetch a single text version by ID
export function useTextVersion(id: string | null) {
  return useFetchById('text_versions', id)
}

// Hook to fetch text versions by language entity (replacing project-based query)
export function useTextVersionsByLanguageEntity(languageEntityId: string | null) {
  return useFetchCollection('text_versions', {
    filters: { language_entity_id: languageEntityId },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!languageEntityId,
  })
}

// Hook to fetch text versions by project (using project's language entity)
export function useTextVersionsByProject(projectId: string | null) {
  const { data: project } = useFetchById('projects', projectId)
  return useTextVersionsByLanguageEntity(project?.source_language_entity_id || null)
}

// Hook to fetch text versions by bible version
export function useTextVersionsByBibleVersion(bibleVersionId: string | null) {
  return useFetchCollection('text_versions', {
    filters: { bible_version_id: bibleVersionId },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!bibleVersionId,
  })
}

// VERSE TEXT HOOKS
// Hook to fetch all verse texts
export function useVerseTexts() {
  return useFetchCollection('verse_texts', {
    orderBy: { column: 'created_at', ascending: false }
  })
}

// Hook to fetch a single verse text by ID
export function useVerseText(id: string | null) {
  return useFetchById('verse_texts', id)
}

// Hook to fetch verse texts by text version
export function useVerseTextsByVersion(textVersionId: string | null) {
  return useFetchCollection('verse_texts', {
    filters: { text_version_id: textVersionId },
    orderBy: { column: 'verse_number', ascending: true },
    enabled: !!textVersionId,
  })
}

// Hook to fetch verse texts by book and chapter
export function useVerseTextsByBookChapter(bookId: string | null, chapterId: string | null) {
  return useFetchCollection('verse_texts', {
    filters: { 
      book_id: bookId,
      chapter_id: chapterId 
    },
    orderBy: { column: 'verse_number', ascending: true },
    enabled: !!bookId && !!chapterId,
  })
}

// Hook to fetch verse texts by verse
export function useVerseTextsByVerse(verseId: string | null) {
  return useFetchCollection('verse_texts', {
    filters: { verse_id: verseId },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!verseId,
  })
} 