import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type TextVersion = TableRow<'text_versions'>
export type VerseText = TableRow<'verse_texts'>

// Enhanced type for verse texts with relations
export interface VerseTextWithRelations extends Omit<VerseText, 'publish_status'> {
  publish_status: "pending" | "published" | "archived";
  text_versions?: TextVersion;
  verses?: {
    id: string;
    verse_number: number;
    chapters?: {
      id: string;
      chapter_number: number;
      books?: {
        name: string;
        id: string;
      };
    };
  };
}

// TEXT VERSION HOOKS
// Hook to fetch all text versions
export function useTextVersions() {
  return useFetchCollection('text_versions', {
    orderBy: { column: 'created_at', ascending: false }
  })
}

// Hook to fetch text versions by project (target language)
export function useTextVersionsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['text_versions_by_project', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      // Get the project to get the target language entity
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()
      
      if (projectError) throw projectError
      if (!project?.target_language_entity_id) return []
      
      const { data, error } = await supabase
        .from('text_versions')
        .select('*')
        .eq('language_entity_id', project.target_language_entity_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as TextVersion[]
    },
    enabled: !!projectId,
  })
}

// Hook to fetch a single text version by ID
export function useTextVersion(id: string | null) {
  return useFetchById('text_versions', id)
}

  // VERSE TEXT HOOKS

// Hook to fetch verse texts by project (replaces the generic useVerseTexts)
export function useVerseTextsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['verse_texts_by_project', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      // Get the project to get the target language entity
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()
      
      if (projectError) throw projectError
      if (!project?.target_language_entity_id) return []
      
      const { data, error } = await supabase
        .from('verse_texts')
        .select(`
          *,
          text_versions!inner (
            id,
            name,
            language_entity_id,
            bible_version_id
          ),
          verses (
            id,
            verse_number,
            chapters (
              id,
              chapter_number,
              books (
                id,
                name
              )
            )
          )
        `)
        .eq('text_versions.language_entity_id', project.target_language_entity_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as VerseTextWithRelations[]
    },
    enabled: !!projectId,
  })
}

// Hook to fetch all verse texts (deprecated - use useVerseTextsByProject instead)
export function useVerseTexts() {
  return useFetchCollection('verse_texts', {
    orderBy: { column: 'created_at', ascending: false }
  })
}

// Hook to fetch verse texts with relations for a project
export function useVerseTextsWithRelations(projectId: string | null) {
  return useQuery({
    queryKey: ['verse_texts_with_relations', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      // First get the project to get the target language entity
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()
      
      if (projectError) throw projectError
      if (!project?.target_language_entity_id) return []
      
      const { data, error } = await supabase
        .from('verse_texts')
        .select(`
          *,
          text_versions (
            id,
            name,
            language_entity_id
          ),
          verses (
            verse_number,
            chapters (
              chapter_number,
              books (
                id,
                name
              )
            )
          )
        `)
        .eq('text_versions.language_entity_id', project.target_language_entity_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as VerseTextWithRelations[]
    },
    enabled: !!projectId,
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

// MUTATION HOOKS

/**
 * Hook to create a text version
 */
export function useCreateTextVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (textVersionData: {
      name: string
      language_entity_id: string
      bible_version_id: string
      text_version_source?: 'official_translation' | 'ai_transcription' | 'user_submitted'
      created_by?: string | null
    }) => {
      const { data, error } = await supabase
        .from('text_versions')
        .insert({
          name: textVersionData.name,
          language_entity_id: textVersionData.language_entity_id,
          bible_version_id: textVersionData.bible_version_id,
          text_version_source: textVersionData.text_version_source || 'user_submitted',
          created_by: textVersionData.created_by || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['text_versions'] })
      queryClient.invalidateQueries({ queryKey: ['text_versions_by_project'] })
    },
  })
}

/**
 * Hook to create a single verse text
 */
export function useCreateVerseText() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (verseTextData: {
      verse_id: string
      text_version_id: string
      verse_text: string
      created_by?: string | null
    }) => {
      const { data, error } = await supabase
        .from('verse_texts')
        .insert({
          verse_id: verseTextData.verse_id,
          text_version_id: verseTextData.text_version_id,
          verse_text: verseTextData.verse_text,
          created_by: verseTextData.created_by || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
}

/**
 * Hook to bulk insert verse texts from CSV data
 */
export function useBulkInsertVerseTexts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (verseTextsData: Array<{
      verse_id: string
      text_version_id: string
      verse_text: string
      created_by?: string | null
    }>) => {
      const insertData = verseTextsData.map(item => ({
        verse_id: item.verse_id,
        text_version_id: item.text_version_id,
        verse_text: item.verse_text,
        created_by: item.created_by || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('verse_texts')
        .insert(insertData)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
}

/**
 * Hook to update a verse text
 */
export function useUpdateVerseText() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string
      updates: {
        verse_text?: string
        text_version_id?: string
      }
    }) => {
      const updateData: Record<string, string> = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.verse_text !== undefined) {
        updateData.verse_text = updates.verse_text
      }
      
      if (updates.text_version_id !== undefined) {
        updateData.text_version_id = updates.text_version_id
      }

      const { data, error } = await supabase
        .from('verse_texts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
}

/**
 * Hook to delete verse texts
 */
export function useDeleteVerseTexts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await supabase
        .from('verse_texts')
        .delete()
        .in('id', ids)

      if (error) throw error
      return { success: true, deletedCount: ids.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
} 

/**
 * Hook to update publish status for individual verse texts
 */
export function useUpdateVerseTextPublishStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      verseTextIds, 
      publishStatus 
    }: { 
      verseTextIds: string[]
      publishStatus: 'pending' | 'published' | 'archived'
    }) => {
      const { data, error } = await supabase
        .from('verse_texts')
        .update({ 
          publish_status: publishStatus,
          updated_at: new Date().toISOString() 
        })
        .in('id', verseTextIds)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
}

/**
 * Hook to update publish status for all verse texts in a text version
 */
export function useUpdateTextVersionPublishStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      textVersionId, 
      publishStatus 
    }: { 
      textVersionId: string
      publishStatus: 'pending' | 'published' | 'archived'
    }) => {
      const { data, error } = await supabase
        .from('verse_texts')
        .update({ 
          publish_status: publishStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('text_version_id', textVersionId)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
}

/**
 * Hook to edit a verse text with new verse reference and text content
 */
export function useEditVerseText() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      verseId, 
      verseText,
      textVersionId
    }: { 
      id: string
      verseId: string
      verseText: string
      textVersionId?: string
    }) => {
      const updateData: Record<string, string> = {
        verse_id: verseId,
        verse_text: verseText,
        updated_at: new Date().toISOString()
      }
      
      if (textVersionId) {
        updateData.text_version_id = textVersionId
      }

      const { data, error } = await supabase
        .from('verse_texts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] })
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] })
    },
  })
} 