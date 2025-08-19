import { supabase } from './supabase';
import type { 
  ImageSet, 
  Image, 
  ProcessedImageFile
} from '../types/images';

export class ImageService {
  /**
   * Create a pending image record for the new by-ID upload flow
   */
  async createPendingImage(request: {
    processedFile: ProcessedImageFile;
    projectData: {
      setId?: string;
      setName?: string;
      createNewSet?: boolean;
    };
    userId: string;
  }): Promise<string> {
    const { processedFile, projectData, userId } = request;

    // Generate a unique object key for R2
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const extension = processedFile.file.name.split('.').pop() || 'bin';
    const objectKey = `${timestamp}-${randomId}.${extension}`;

    // Determine set_id
    let setId = projectData.setId;
    if (projectData.createNewSet && projectData.setName) {
      // Create new set first
      const newSet = await this.createImageSet(projectData.setName);
      setId = newSet.id;
    }

    const insertData = {
      target_type: processedFile.selectedTargetType,
      target_id: processedFile.selectedTargetId!,
      set_id: setId || null,
      object_key: objectKey,
      storage_provider: 'r2',
      remote_path: `r2://${objectKey}`, // Deprecated but kept for schema compatibility
      upload_status: 'pending' as const,
      publish_status: 'pending' as const,
      version: 1,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('images')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating pending image:', error);
      throw new Error(`Failed to create pending image: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Finalize an image record after successful upload to R2
   */
  async finalizeImage(request: {
    imageId: string;
    fileSize: number;
  }): Promise<void> {
    const { imageId, fileSize } = request;

    const { error } = await supabase
      .from('images')
      .update({
        file_size: fileSize,
        upload_status: 'completed' as const,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    if (error) {
      console.error('Error finalizing image:', error);
      throw new Error(`Failed to finalize image: ${error.message}`);
    }
  }

  /**
   * Get all image sets for the current user
   */
  async getImageSets(): Promise<ImageSet[]> {
    const { data, error } = await supabase
      .from('image_sets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch image sets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get images for a specific set or all images for the user
   */
  async getImages(setId?: string): Promise<Image[]> {
    let query = supabase
      .from('images')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (setId) {
      query = query.eq('set_id', setId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new image set
   */
  async createImageSet(name: string): Promise<ImageSet> {
    const { data, error } = await supabase
      .from('image_sets')
      .insert({
        name
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create image set: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an image's target
   */
  async updateImageTarget(
    imageId: string, 
    targetType: 'chapter' | 'book' | 'sermon' | 'passage' | 'verse' | 'podcast' | 'film_segment' | 'audio_segment', 
    targetId: string
  ): Promise<Image> {
    const { data, error } = await supabase
      .from('images')
      .update({
        target_type: targetType,
        target_id: targetId
      })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update image: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an image's publish status
   */
  async updateImagePublishStatus(
    imageId: string, 
    publishStatus: 'pending' | 'published' | 'archived'
  ): Promise<Image> {
    const { data, error } = await supabase
      .from('images')
      .update({
        publish_status: publishStatus
      })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update image publish status: ${error.message}`);
    }

    return data;
  }

  /**
   * Batch update publish status for multiple images
   */
  async batchUpdateImagePublishStatus(
    imageIds: string[], 
    publishStatus: 'pending' | 'published' | 'archived'
  ): Promise<void> {
    const { error } = await supabase
      .from('images')
      .update({
        publish_status: publishStatus
      })
      .in('id', imageIds);

    if (error) {
      throw new Error(`Failed to batch update image publish status: ${error.message}`);
    }
  }

  /**
   * Delete an image (soft delete)
   */
  async deleteImage(imageId: string): Promise<void> {
    const { error } = await supabase
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Delete an image set and all its images (soft delete)
   */
  async deleteImageSet(setId: string): Promise<void> {
    // First soft delete all images in the set
    const { error: imagesError } = await supabase
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('set_id', setId);

    if (imagesError) {
      throw new Error(`Failed to delete images in set: ${imagesError.message}`);
    }

    // Then delete the set (hard delete for sets)
    const { error: setError } = await supabase
      .from('image_sets')
      .delete()
      .eq('id', setId);

    if (setError) {
      throw new Error(`Failed to delete image set: ${setError.message}`);
    }
  }
}

export const imageService = new ImageService(); 