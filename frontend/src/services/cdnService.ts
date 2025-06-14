/**
 * CDN service for optimized static asset delivery
 */

interface CDNConfig {
  baseUrl: string;
  version?: string;
  enableWebP?: boolean;
  enableAVIF?: boolean;
  defaultQuality?: number;
}

class CDNService {
  private config: CDNConfig;
  private supportedFormats: Set<string> = new Set();

  constructor(config: CDNConfig) {
    this.config = {
      enableWebP: true,
      enableAVIF: true,
      defaultQuality: 85,
      ...config
    };
    
    this.detectSupportedFormats();
  }

  private async detectSupportedFormats(): Promise<void> {
    // Check WebP support
    if (this.config.enableWebP && await this.canDisplayFormat('webp')) {
      this.supportedFormats.add('webp');
    }

    // Check AVIF support
    if (this.config.enableAVIF && await this.canDisplayFormat('avif')) {
      this.supportedFormats.add('avif');
    }
  }

  private canDisplayFormat(format: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      
      const testImages = {
        webp: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA',
        avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
      };
      
      img.src = testImages[format as keyof typeof testImages];
    });
  }

  /**
   * Get optimized image URL with CDN transformations
   */
  getImageUrl(
    path: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      blur?: number;
      progressive?: boolean;
    } = {}
  ): string {
    const {
      width,
      height,
      quality = this.config.defaultQuality,
      format = 'auto',
      fit = 'cover',
      blur,
      progressive = true
    } = options;

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Build transformation parameters
    const params = new URLSearchParams();
    
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    if (quality !== undefined) params.append('q', quality.toString());
    params.append('fit', fit);
    
    if (blur) params.append('blur', blur.toString());
    if (progressive) params.append('fm', 'progressive');
    
    // Auto-format detection
    if (format === 'auto') {
      if (this.supportedFormats.has('avif')) {
        params.append('f', 'avif');
      } else if (this.supportedFormats.has('webp')) {
        params.append('f', 'webp');
      }
    } else {
      params.append('f', format);
    }

    // Add version for cache busting
    if (this.config.version) {
      params.append('v', this.config.version);
    }

    const queryString = params.toString();
    return `${this.config.baseUrl}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Generate responsive image srcset
   */
  getResponsiveSrcSet(
    path: string,
    sizes: number[] = [320, 640, 960, 1280, 1920],
    options: Omit<Parameters<typeof this.getImageUrl>[1], 'width'> = {}
  ): string {
    return sizes
      .map(size => `${this.getImageUrl(path, { ...options, width: size })} ${size}w`)
      .join(', ');
  }

  /**
   * Get video URL with CDN optimizations
   */
  getVideoUrl(
    path: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | 'low' | 'medium' | 'high';
      format?: 'auto' | 'mp4' | 'webm' | 'hls';
      poster?: boolean;
    } = {}
  ): string {
    const {
      width,
      height,
      quality = 'auto',
      format = 'auto',
      poster = false
    } = options;

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const params = new URLSearchParams();
    
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    if (quality !== 'auto') params.append('q', quality);
    if (format !== 'auto') params.append('f', format);
    if (poster) params.append('poster', 'true');
    
    if (this.config.version) {
      params.append('v', this.config.version);
    }

    const queryString = params.toString();
    return `${this.config.baseUrl}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Get static asset URL (CSS, JS, fonts)
   */
  getAssetUrl(path: string, options: { version?: string; minified?: boolean } = {}): string {
    const { version = this.config.version, minified = true } = options;
    
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Add .min suffix for minification
    if (minified && !cleanPath.includes('.min.')) {
      const lastDotIndex = cleanPath.lastIndexOf('.');
      if (lastDotIndex > 0) {
        cleanPath = cleanPath.slice(0, lastDotIndex) + '.min' + cleanPath.slice(lastDotIndex);
      }
    }

    const params = new URLSearchParams();
    if (version) params.append('v', version);
    
    const queryString = params.toString();
    return `${this.config.baseUrl}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Preload critical resources
   */
  preloadAssets(assets: Array<{
    path: string;
    type: 'image' | 'video' | 'font' | 'style' | 'script';
    priority?: 'high' | 'medium' | 'low';
    options?: any;
  }>): void {
    if (typeof document === 'undefined') return;

    assets.forEach(({ path, type, priority = 'medium', options = {} }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      
      switch (type) {
        case 'image':
          link.href = this.getImageUrl(path, options);
          link.as = 'image';
          break;
        case 'video':
          link.href = this.getVideoUrl(path, options);
          link.as = 'video';
          break;
        case 'font':
          link.href = this.getAssetUrl(path, options);
          link.as = 'font';
          link.crossOrigin = 'anonymous';
          break;
        case 'style':
          link.href = this.getAssetUrl(path, options);
          link.as = 'style';
          break;
        case 'script':
          link.href = this.getAssetUrl(path, options);
          link.as = 'script';
          break;
      }
      
      // Set priority hints if supported
      if ('importance' in link) {
        (link as any).importance = priority;
      }
      
      document.head.appendChild(link);
    });
  }

  /**
   * Generate placeholder for images
   */
  getPlaceholder(
    path: string,
    options: {
      width?: number;
      height?: number;
      blur?: number;
      quality?: number;
    } = {}
  ): string {
    return this.getImageUrl(path, {
      width: 20,
      height: 20,
      blur: 5,
      quality: 20,
      ...options
    });
  }

  /**
   * Cache warming for critical assets
   */
  warmCache(assets: string[]): Promise<void[]> {
    return Promise.all(
      assets.map(asset => 
        fetch(this.getAssetUrl(asset), { method: 'HEAD' })
          .then(() => console.log(`Warmed cache for: ${asset}`))
          .catch(err => console.warn(`Failed to warm cache for ${asset}:`, err))
      )
    );
  }

  /**
   * Update CDN configuration
   */
  updateConfig(newConfig: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.detectSupportedFormats();
  }

  /**
   * Get cache status and statistics
   */
  getCacheStats(): Promise<{
    hitRate: number;
    bandwidth: number;
    requests: number;
  }> {
    // This would typically call a CDN API endpoint
    return Promise.resolve({
      hitRate: 0.85,
      bandwidth: 1024 * 1024 * 100, // 100MB
      requests: 1000
    });
  }
}

// Create default CDN service instance
export const cdnService = new CDNService({
  baseUrl: process.env.REACT_APP_CDN_URL || 'https://cdn.ajlongelectric.com',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  enableWebP: true,
  enableAVIF: true,
  defaultQuality: 85
});

export default CDNService;