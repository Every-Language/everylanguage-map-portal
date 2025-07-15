import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';
import { ImageIcon, Loader2, AlertCircle } from 'lucide-react';

const imageVariants = cva(
  'relative overflow-hidden transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 dark:bg-gray-800',
        rounded: 'rounded-lg bg-gray-100 dark:bg-gray-800',
        circular: 'rounded-full bg-gray-100 dark:bg-gray-800',
        square: 'aspect-square bg-gray-100 dark:bg-gray-800',
        card: 'rounded-lg shadow-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800',
      },
      size: {
        xs: 'w-8 h-8',
        sm: 'w-12 h-12',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32',
        '2xl': 'w-48 h-48',
        full: 'w-full h-full',
      },
      objectFit: {
        contain: 'object-contain',
        cover: 'object-cover',
        fill: 'object-fill',
        'scale-down': 'object-scale-down',
        none: 'object-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      objectFit: 'cover',
    },
  }
);

interface ImageProps extends VariantProps<typeof imageVariants> {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  placeholder?: React.ReactNode;
  loading?: 'lazy' | 'eager';
  decoding?: 'auto' | 'sync' | 'async';
  crossOrigin?: 'anonymous' | 'use-credentials';
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  aspectRatio?: number;
  width?: number;
  height?: number;
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
  unoptimized?: boolean;
  draggable?: boolean;
  threshold?: number;
  rootMargin?: string;
  fadeIn?: boolean;
  showLoadingIndicator?: boolean;
  showErrorIndicator?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ImageState {
  isLoading: boolean;
  hasError: boolean;
  isInView: boolean;
  retryCount: number;
}

export const Image = React.forwardRef<HTMLDivElement, ImageProps>(
  ({
    src,
    alt,
    className,
    fallback,
    placeholder,
    loading = 'lazy',
    decoding = 'auto',
    crossOrigin,
    onLoad,
    onError,
    onLoadStart,
    onLoadEnd,
    aspectRatio,
    width,
    height,
    blurDataURL,
    quality = 75,
    priority = false,
    unoptimized = false,
    draggable = false,
    threshold = 0.1,
    rootMargin = '50px',
    fadeIn = true,
    showLoadingIndicator = true,
    showErrorIndicator = true,
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    variant,
    size,
    objectFit,
    ...props
  }, ref) => {
    const [state, setState] = useState<ImageState>({
      isLoading: true,
      hasError: false,
      isInView: false,
      retryCount: 0,
    });

    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Intersection Observer for lazy loading
    useEffect(() => {
      const element = containerRef.current;
      if (!element || loading === 'eager' || priority) {
        setState(prev => ({ ...prev, isInView: true }));
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setState(prev => ({ ...prev, isInView: true }));
            observer.disconnect();
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      observer.observe(element);
      return () => observer.disconnect();
    }, [loading, priority, threshold, rootMargin]);

    // Handle image load
    const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
      setState(prev => ({ ...prev, isLoading: false, hasError: false }));
      onLoad?.(event);
      onLoadEnd?.();
    }, [onLoad, onLoadEnd]);

    // Handle image error
    const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
      setState(prev => ({ ...prev, isLoading: false, hasError: true }));
      onError?.(event);
      onLoadEnd?.();
    }, [onError, onLoadEnd]);

    // Handle retry
    const handleRetry = useCallback(() => {
      if (retryOnError && state.retryCount < maxRetries) {
        retryTimeoutRef.current = setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            isLoading: true, 
            hasError: false, 
            retryCount: prev.retryCount + 1 
          }));
          
          // Force reload by updating src
          if (imgRef.current) {
            const newSrc = src + (src.includes('?') ? '&' : '?') + `retry=${state.retryCount + 1}`;
            imgRef.current.src = newSrc;
          }
        }, retryDelay);
      }
    }, [retryOnError, state.retryCount, maxRetries, retryDelay, src]);

    // Handle load start
    const handleLoadStart = useCallback(() => {
      setState(prev => ({ ...prev, isLoading: true, hasError: false }));
      onLoadStart?.();
    }, [onLoadStart]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }, []);

    // Generate srcset for responsive images
    const generateSrcSet = useCallback((baseSrc: string, widths: number[]) => {
      if (unoptimized) return undefined;
      
      return widths
        .map(width => `${baseSrc}?w=${width}&q=${quality} ${width}w`)
        .join(', ');
    }, [unoptimized, quality]);

    // Generate sizes attribute
    const generateSizes = useCallback((breakpoints: Record<string, string>) => {
      return Object.entries(breakpoints)
        .map(([breakpoint, size]) => 
          breakpoint === 'default' ? size : `(${breakpoint}) ${size}`
        )
        .join(', ');
    }, []);

    // Determine if image should be rendered
    const shouldRenderImage = state.isInView && !state.hasError;

    // Container styles
    const containerStyles: React.CSSProperties = {
      aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
      width: width ? `${width}px` : undefined,
      height: height ? `${height}px` : undefined,
    };

    // Image styles
    const imageStyles: React.CSSProperties = {
      opacity: state.isLoading && fadeIn ? 0 : 1,
      transition: fadeIn ? 'opacity 0.3s ease-in-out' : 'none',
    };

    // Blur placeholder styles
    const blurStyles: React.CSSProperties = blurDataURL ? {
      backgroundImage: `url(${blurDataURL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'blur(4px)',
    } : {};

    return (
      <div
        ref={ref}
        className={cn(imageVariants({ variant, size, objectFit }), className)}
        style={containerStyles}
        {...props}
      >
        <div
          ref={containerRef}
          className="w-full h-full relative"
          style={blurStyles}
        >
          {/* Blur placeholder */}
          {blurDataURL && state.isLoading && (
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-sm"
              style={{ backgroundImage: `url(${blurDataURL})` }}
            />
          )}

          {/* Custom placeholder */}
          {placeholder && (state.isLoading || !state.isInView) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {placeholder}
            </div>
          )}

          {/* Loading indicator */}
          {showLoadingIndicator && state.isLoading && !placeholder && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* Error state */}
          {state.hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {fallback || (
                <>
                  {showErrorIndicator && (
                    <AlertCircle className="w-6 h-6 text-gray-400 mb-2" />
                  )}
                  <span className="text-xs text-gray-500 text-center px-2">
                    Failed to load image
                  </span>
                                     {retryOnError && state.retryCount < maxRetries && (
                     <button
                       onClick={handleRetry}
                       className="mt-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                     >
                       Retry ({state.retryCount + 1}/{maxRetries})
                     </button>
                   )}
                </>
              )}
            </div>
          )}

          {/* Main image */}
          {shouldRenderImage && (
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              width={width}
              height={height}
              loading={priority ? 'eager' : loading}
              decoding={decoding}
              crossOrigin={crossOrigin}
              draggable={draggable}
              className={cn(
                'w-full h-full',
                imageVariants({ objectFit }),
                'transition-opacity duration-300'
              )}
              style={imageStyles}
              srcSet={generateSrcSet(src, [640, 750, 828, 1080, 1200, 1920, 2048, 3840])}
              sizes={generateSizes({
                '(max-width: 640px)': '100vw',
                '(max-width: 1024px)': '50vw',
                'default': '33vw',
              })}
              onLoad={handleLoad}
              onError={handleError}
              onLoadStart={handleLoadStart}
            />
          )}

          {/* Default placeholder when not in view */}
          {!state.isInView && !placeholder && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

Image.displayName = 'Image';

// Utility component for avatar images
export const Avatar = React.forwardRef<HTMLDivElement, Omit<ImageProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Image
      ref={ref}
      variant="circular"
      className={cn('flex-shrink-0', className)}
      {...props}
    />
  )
);

Avatar.displayName = 'Avatar';

// Utility component for thumbnails
export const Thumbnail = React.forwardRef<HTMLDivElement, Omit<ImageProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Image
      ref={ref}
      variant="rounded"
      className={cn('flex-shrink-0', className)}
      {...props}
    />
  )
);

Thumbnail.displayName = 'Thumbnail';

// Utility component for hero images
export const HeroImage = React.forwardRef<HTMLDivElement, Omit<ImageProps, 'variant' | 'size'>>(
  ({ className, ...props }, ref) => (
    <Image
      ref={ref}
      variant="default"
      size="full"
      className={cn('w-full h-64 sm:h-80 lg:h-96', className)}
      {...props}
    />
  )
);

HeroImage.displayName = 'HeroImage';

export default Image; 