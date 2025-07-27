import { supabase } from './supabase';
import type { 
  ImageSet, 
  Image, 
  ImageUploadRequest, 
  ImageUploadResponse
} from '../types/images';

export class ImageService {
  
  /**
   * Upload a single image to the backend using the edge function
   */
  async uploadImage(
    file: File, 
    uploadRequest: ImageUploadRequest,
    authToken: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResponse> {
    try {
      onProgress?.(10);

      // Create FormData for the multipart request
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_type', uploadRequest.target_type);
      formData.append('target_id', uploadRequest.target_id);
      
      if (uploadRequest.set_id) {
        formData.append('set_id', uploadRequest.set_id);
      }
      
      if (uploadRequest.createNewSet && uploadRequest.setName) {
        formData.append('create_new_set', 'true');
        formData.append('set_name', uploadRequest.setName);
        if (uploadRequest.setRemotePath) {
          formData.append('set_remote_path', uploadRequest.setRemotePath);
        }
      }
      
      if (uploadRequest.metadata) {
        formData.append('metadata', JSON.stringify(uploadRequest.metadata));
      }

      onProgress?.(30);

      // Get the Supabase URL for the edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL environment variable not set');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData
      });

      onProgress?.(80);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: ImageUploadResponse = await response.json();
      onProgress?.(100);

      return result;

    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
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