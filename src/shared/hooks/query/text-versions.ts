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
        .is('deleted_at', null) // Exclude soft-deleted verse texts
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as VerseTextWithRelations[]
    },
    enabled: !!projectId,
  })
}

// Hook to fetch verse texts by project with server-side pagination and filtering
export function useVerseTextsByProjectPaginated(
  projectId: string | null,
  options: {
    page: number
    pageSize: number
    textVersionId?: string | null
    bookId?: string | null  
    chapterId?: string | null
    publishStatus?: string | null
    searchText?: string | null
    sortField?: string | null
    sortDirection?: 'asc' | 'desc' | null
    showDeleted?: boolean
  }
) {
  return useQuery({
    queryKey: ['verse_texts_by_project_paginated', projectId, options],
    queryFn: async () => {
      if (!projectId) return { data: [], count: 0 }
      
      // Get the project to get the target language entity
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()
      
      if (projectError) throw projectError
      if (!project?.target_language_entity_id) return { data: [], count: 0 }
      
      // Build the query with proper joins
      let query = supabase
        .from('verse_texts')
        .select(`
          *,
          text_versions!inner (
            id,
            name,
            language_entity_id,
            bible_version_id
          ),
          verses!inner (
            id,
            verse_number,
            chapters!inner (
              id,
              chapter_number,
              books!inner (
                id,
                name
              )
            )
          )
        `, { count: 'exact' })
        .eq('text_versions.language_entity_id', project.target_language_entity_id)
      
      // Apply deleted filter
      if (options.showDeleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }
      
      // Apply filters
      if (options.textVersionId && options.textVersionId !== 'all') {
        query = query.eq('text_version_id', options.textVersionId)
      }
      
      if (options.bookId && options.bookId !== 'all') {
        query = query.eq('verses.chapters.books.id', options.bookId)
      }
      
      if (options.chapterId && options.chapterId !== 'all') {
        query = query.eq('verses.chapter_id', options.chapterId)
      }
      
      if (options.publishStatus && options.publishStatus !== 'all') {
        query = query.eq('publish_status', options.publishStatus as 'pending' | 'published' | 'archived')
      }
      
      // Enhanced search: search both verse text and verse reference
      if (options.searchText && options.searchText.trim()) {
        const searchTerm = options.searchText.trim()
        
        // Check if search term looks like a verse reference pattern
        const versePattern = /^(\d+):(\d+)$/ // matches "1:1" format
        const chapterPattern = /^\d+$/ // matches just chapter number
        
        if (versePattern.test(searchTerm)) {
          // Search for specific chapter:verse pattern using nested field syntax
          const [, chapter, verse] = searchTerm.match(versePattern)!
          query = query
            .eq('verses.chapters.chapter_number', parseInt(chapter))
            .eq('verses.verse_number', parseInt(verse))
        } else if (chapterPattern.test(searchTerm)) {
          // Search for specific chapter number
          query = query.eq('verses.chapters.chapter_number', parseInt(searchTerm))
        } else {
          // Simple text search in verse_text only to avoid OR syntax issues
          query = query.ilike('verse_text', `%${searchTerm}%`)
        }
      }
      
      // Apply sorting
      const sortField = options.sortField || 'created_at'
      const sortDirection = options.sortDirection || 'desc'
      
      if (sortField === 'verse_reference') {
        // For verse reference sorting, sort by created_at for now
        // Complex nested sorting is not well supported in Supabase PostgREST
        query = query.order('created_at', { ascending: sortDirection === 'asc' })
      } else {
        query = query.order(sortField, { ascending: sortDirection === 'asc' })
      }
      
      // Apply pagination
      const startIndex = (options.page - 1) * options.pageSize
      query = query.range(startIndex, startIndex + options.pageSize - 1)
      
      const { data, error, count } = await query
      
      if (error) throw error
      return { 
        data: data as VerseTextWithRelations[], 
        count: count || 0 
      }
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
        .is('deleted_at', null) // Exclude soft-deleted verse texts
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
  return useQuery({
    queryKey: ['verse_texts_by_book_chapter', bookId, chapterId],
    queryFn: async () => {
      if (!bookId || !chapterId) return []
      
      const { data, error } = await supabase
        .from('verse_texts')
        .select(`
          *,
          text_versions (
            id,
            name,
            language_entity_id
          ),
          verses!inner (
            id,
            verse_number,
            chapter_id
          )
        `)
        .eq('verses.chapter_id', chapterId)
        .order('verses.verse_number', { ascending: true })
      
      if (error) throw error
      return data
    },
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

      // Step 1: Delete existing records for the verses we're about to insert
      // This works around the partial unique index issue by ensuring no conflicts
      const uniqueVerseTextVersionPairs = [...new Set(
        verseTextsData.map(item => `${item.verse_id}:${item.text_version_id}`)
      )]

      for (const pair of uniqueVerseTextVersionPairs) {
        const [verse_id, text_version_id] = pair.split(':')
        
        // Delete existing record for this verse + text version combination
        // RLS policy ensures user can only delete their own records
        const { error: deleteError } = await supabase
          .from('verse_texts')
          .delete()
          .eq('verse_id', verse_id)
          .eq('text_version_id', text_version_id)
        
        if (deleteError) {
          console.warn(`Warning: Could not delete existing verse text for ${verse_id}:${text_version_id}:`, deleteError)
          // Continue anyway - the record might not exist or user might not own it
        }
      }

      // Step 2: Insert all the new records
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
 * Hook to bulk insert verse texts from CSV data with chunked processing and progress tracking
 */
export function useChunkedBulkInsertVerseTexts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      verseTextsData, 
      onProgress 
    }: {
      verseTextsData: Array<{
        verse_id: string
        text_version_id: string
        verse_text: string
        created_by?: string | null
      }>
      onProgress?: (progress: { completed: number; total: number; currentBatch: number; totalBatches: number }) => void
    }) => {
      const BATCH_SIZE = 1000 // Process 1000 verses at a time (increased due to upsert efficiency)
      const totalRecords = verseTextsData.length
      const totalBatches = Math.ceil(totalRecords / BATCH_SIZE)
      
      console.log(`🚀 Starting chunked bulk insert: ${totalRecords} records in ${totalBatches} batches`)
      
      const results = []
      let completed = 0
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, totalRecords)
        const batch = verseTextsData.slice(start, end)
        
        console.log(`📦 Processing batch ${i + 1}/${totalBatches}: ${batch.length} records`)
        
        // Update progress before processing batch
        onProgress?.({ 
          completed, 
          total: totalRecords, 
          currentBatch: i + 1, 
          totalBatches 
        })
        
        const insertData = batch.map(item => ({
          verse_id: item.verse_id,
          text_version_id: item.text_version_id,
          verse_text: item.verse_text,
          created_by: item.created_by || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        // Use batch delete then insert for better performance than individual deletes
        // First, get existing verse_text IDs for this batch to delete them
        const verseIds = batch.map(item => item.verse_id)
        const textVersionIds = [...new Set(batch.map(item => item.text_version_id))]
        
        if (textVersionIds.length === 1) {
          // Single text version - more efficient query
          const { error: deleteError } = await supabase
            .from('verse_texts')
            .delete()
            .eq('text_version_id', textVersionIds[0])
            .in('verse_id', verseIds)
          
          if (deleteError) {
            console.warn('Warning: Could not delete existing verse texts:', deleteError)
          }
        } else {
          // Multiple text versions - need individual deletes for each combination
          const uniquePairs = [...new Set(batch.map(item => `${item.verse_id}:${item.text_version_id}`))]
          for (const pair of uniquePairs) {
            const [verse_id, text_version_id] = pair.split(':')
            const { error: deleteError } = await supabase
              .from('verse_texts')
              .delete()
              .eq('verse_id', verse_id)
              .eq('text_version_id', text_version_id)
            
            if (deleteError) {
              console.warn(`Warning: Could not delete existing verse text for ${verse_id}:${text_version_id}:`, deleteError)
            }
          }
        }

        // Now insert the new records
        const { data, error } = await supabase
          .from('verse_texts')
          .insert(insertData)
          .select()

        if (error) {
          console.error(`❌ Batch ${i + 1} failed:`, error)
          throw new Error(`Batch ${i + 1} failed: ${error.message}`)
        }
        
        results.push(...(data || []))
        completed += batch.length
        
        console.log(`✅ Batch ${i + 1}/${totalBatches} completed: ${batch.length} records`)
        
        // Update progress after batch completion
        onProgress?.({ 
          completed, 
          total: totalRecords, 
          currentBatch: i + 1, 
          totalBatches 
        })
        
        // Small delay to prevent overwhelming the database (reduced due to upsert efficiency)
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      console.log(`🎉 Chunked bulk insert completed: ${results.length} records inserted`)
      return results
    },
    onSuccess: (data, variables) => {
      // Only invalidate specific queries to avoid triggering unrelated subscriptions
      const textVersionId = variables.verseTextsData[0]?.text_version_id
      if (textVersionId) {
        queryClient.invalidateQueries({ 
          queryKey: ['verse_texts_by_project'],
          exact: false 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['verse_texts_with_relations'],
          exact: false 
        })
        // Don't invalidate the broad 'verse_texts' query to avoid media file subscriptions
      }
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

/**
 * Mutation to soft delete verse texts
 */
export function useSoftDeleteVerseTexts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ verseTextIds }: { verseTextIds: string[] }) => {
      const { data, error } = await supabase
        .from('verse_texts')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', verseTextIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch verse texts
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] });
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] });
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] });
    },
  });
}

/**
 * Mutation to restore (undelete) verse texts
 */
export function useRestoreVerseTexts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ verseTextIds }: { verseTextIds: string[] }) => {
      const { data, error } = await supabase
        .from('verse_texts')
        .update({ deleted_at: null })
        .in('id', verseTextIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch verse texts
      queryClient.invalidateQueries({ queryKey: ['verse_texts'] });
      queryClient.invalidateQueries({ queryKey: ['verse_texts_with_relations'] });
      queryClient.invalidateQueries({ queryKey: ['verse_texts_by_project'] });
      queryClient.invalidateQueries({ queryKey: ['deleted_verse_texts'] });
    },
  });
}

/**
 * Hook to fetch deleted verse texts for recovery
 */
export function useDeletedVerseTextsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['deleted_verse_texts', projectId],
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
        .not('deleted_at', 'is', null) // Only fetch soft-deleted verse texts
        .order('deleted_at', { ascending: false })
      
      if (error) throw error
      return data as VerseTextWithRelations[]
    },
    enabled: !!projectId,
  })
} 