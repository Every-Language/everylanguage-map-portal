import { useQuery } from '@tanstack/react-query';
import { imageService } from '../../services/imageService';
import type { ImageSet, Image } from '../../types/images';

/**
 * Hook to fetch all image sets for the current user
 */
export function useImageSets() {
  return useQuery<ImageSet[], Error>({
    queryKey: ['image-sets'],
    queryFn: () => imageService.getImageSets(),
  });
}

/**
 * Hook to fetch images for a specific set or all images
 */
export function useImages(setId?: string) {
  return useQuery<Image[], Error>({
    queryKey: ['images', setId],
    queryFn: () => imageService.getImages(setId),
  });
} 