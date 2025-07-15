import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '../services/supabase'
import type { 
  UploadStore, 
  UploadState, 
  UploadFile, 
  UploadBatch,
  UploadStatus 
} from './types'

// Initial state
const initialState: UploadState = {
  batches: [],
  currentBatch: null,
  isUploading: false,
  globalProgress: 0,
  error: null,
}

// Create the upload store
export const useUploadStore = create<UploadStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Actions
      createBatch: (projectId: string, files: File[]) => {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const uploadFiles: UploadFile[] = files.map((file, index) => ({
          id: `file_${index}_${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0,
          error: null,
          metadata: {
            duration: undefined,
            detectedBook: undefined,
            detectedChapter: undefined,
            detectedVerses: undefined,
          },
        }))

        const batch: UploadBatch = {
          id: batchId,
          files: uploadFiles,
          projectId,
          status: 'pending',
          progress: 0,
          error: null,
        }

        const currentBatches = get().batches
        set({ 
          batches: [...currentBatches, batch],
          currentBatch: batch,
          error: null 
        })

        return batchId
      },

      startUpload: async (batchId: string) => {
        const batch = get().batches.find(b => b.id === batchId)
        if (!batch) return

        try {
          set({ isUploading: true, error: null })
          
          // Update batch status
          const updatedBatches = get().batches.map(b => 
            b.id === batchId 
              ? { ...b, status: 'uploading' as const, startedAt: new Date() }
              : b
          )
          set({ batches: updatedBatches })

          // Process files sequentially for now
          for (const file of batch.files) {
            await get().uploadSingleFile(batchId, file.id)
          }

          // Mark batch as completed
          const finalBatches = get().batches.map(b => 
            b.id === batchId 
              ? { ...b, status: 'completed' as const, completedAt: new Date(), progress: 100 }
              : b
          )
          set({ batches: finalBatches, isUploading: false })

        } catch (error) {
          console.error('Upload batch failed:', error)
          
          // Mark batch as failed
          const failedBatches = get().batches.map(b => 
            b.id === batchId 
              ? { ...b, status: 'failed' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : b
          )
          set({ 
            batches: failedBatches, 
            isUploading: false,
            error: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      },

      uploadSingleFile: async (batchId: string, fileId: string) => {
        const batch = get().batches.find(b => b.id === batchId)
        const file = batch?.files.find(f => f.id === fileId)
        
        if (!batch || !file) return

        try {
          // Update file status to uploading
          get().updateFileStatus(batchId, fileId, 'uploading')

          // Upload to Supabase storage
          const filePath = `${batch.projectId}/${file.name}`
          
          const { error: uploadError } = await supabase.storage
            .from('audio-files')
            .upload(filePath, file.file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) throw uploadError

          // Create database record
          const { error: dbError } = await supabase
            .from('media_files')
            .insert({
              project_id: batch.projectId,
              language_entity_id: batch.projectId, // This should be properly set
              media_type: 'audio',
              local_path: filePath,
              file_size: file.size,
              upload_status: 'completed',
              duration_seconds: file.metadata?.duration,
            })

          if (dbError) throw dbError

          // Mark file as completed
          get().updateFileStatus(batchId, fileId, 'completed')

        } catch (error) {
          console.error('Single file upload failed:', error)
          get().updateFileStatus(batchId, fileId, 'failed')
          get().updateFileError(batchId, fileId, error instanceof Error ? error.message : 'Upload failed')
        }
      },

      updateFileStatus: (batchId: string, fileId: string, status: UploadStatus) => {
        const updatedBatches = get().batches.map(batch => 
          batch.id === batchId 
            ? {
                ...batch,
                files: batch.files.map(file => 
                  file.id === fileId ? { ...file, status } : file
                )
              }
            : batch
        )
        set({ batches: updatedBatches })
      },

      updateFileProgress: (batchId: string, fileId: string, progress: number) => {
        const updatedBatches = get().batches.map(batch => 
          batch.id === batchId 
            ? {
                ...batch,
                files: batch.files.map(file => 
                  file.id === fileId ? { ...file, progress } : file
                ),
                progress: batch.files.reduce((sum, f) => sum + (f.id === fileId ? progress : f.progress), 0) / batch.files.length
              }
            : batch
        )
        set({ batches: updatedBatches })
      },

      updateFileError: (batchId: string, fileId: string, error: string) => {
        const updatedBatches = get().batches.map(batch => 
          batch.id === batchId 
            ? {
                ...batch,
                files: batch.files.map(file => 
                  file.id === fileId ? { ...file, error } : file
                )
              }
            : batch
        )
        set({ batches: updatedBatches })
      },

      pauseUpload: (batchId: string) => {
        // For now, just mark as paused - full implementation would need to cancel ongoing uploads
        console.log('Pausing upload for batch:', batchId)
      },

      resumeUpload: (batchId: string) => {
        // Resume implementation would restart failed/paused uploads
        console.log('Resuming upload for batch:', batchId)
      },

      cancelUpload: (batchId: string) => {
        const updatedBatches = get().batches.map(batch => 
          batch.id === batchId 
            ? { ...batch, status: 'failed' as const, error: 'Upload cancelled' }
            : batch
        )
        set({ batches: updatedBatches, isUploading: false })
      },

      removeFile: (batchId: string, fileId: string) => {
        const updatedBatches = get().batches.map(batch => 
          batch.id === batchId 
            ? {
                ...batch,
                files: batch.files.filter(file => file.id !== fileId)
              }
            : batch
        )
        set({ batches: updatedBatches })
      },

      updateFileMetadata: (batchId: string, fileId: string, metadata: UploadFile['metadata']) => {
        const updatedBatches = get().batches.map(batch => 
          batch.id === batchId 
            ? {
                ...batch,
                files: batch.files.map(file => 
                  file.id === fileId 
                    ? { ...file, metadata: { ...file.metadata, ...metadata } }
                    : file
                )
              }
            : batch
        )
        set({ batches: updatedBatches })
      },

      clearCompleted: () => {
        const activeBatches = get().batches.filter(batch => 
          batch.status === 'pending' || batch.status === 'uploading'
        )
        set({ batches: activeBatches })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'upload-store',
    }
  )
)

// Selectors for common use cases
export const useUploadBatches = () => useUploadStore((state) => state.batches)
export const useCurrentBatch = () => useUploadStore((state) => state.currentBatch)
export const useIsUploading = () => useUploadStore((state) => state.isUploading)
export const useGlobalProgress = () => useUploadStore((state) => state.globalProgress)
export const useUploadError = () => useUploadStore((state) => state.error)

// Action selectors
export const useUploadActions = () => useUploadStore((state) => ({
  createBatch: state.createBatch,
  startUpload: state.startUpload,
  pauseUpload: state.pauseUpload,
  resumeUpload: state.resumeUpload,
  cancelUpload: state.cancelUpload,
  removeFile: state.removeFile,
  updateFileMetadata: state.updateFileMetadata,
  clearCompleted: state.clearCompleted,
  clearError: state.clearError,
}))

// Helper selectors
export const useBatchById = (batchId: string) => 
  useUploadStore((state) => state.batches.find(batch => batch.id === batchId))

export const useFileById = (batchId: string, fileId: string) => 
  useUploadStore((state) => {
    const batch = state.batches.find(b => b.id === batchId)
    return batch?.files.find(f => f.id === fileId)
  })

export const useActiveBatches = () => 
  useUploadStore((state) => state.batches.filter(batch => 
    batch.status === 'pending' || batch.status === 'uploading'
  ))

export const useCompletedBatches = () => 
  useUploadStore((state) => state.batches.filter(batch => 
    batch.status === 'completed'
  ))

export const useFailedBatches = () => 
  useUploadStore((state) => state.batches.filter(batch => 
    batch.status === 'failed'
  ))