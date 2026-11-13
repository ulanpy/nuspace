// Helper to get the base name of a file
const getFileBaseName = (name: string): string => {
  const lastDotIndex = name.lastIndexOf(".");
  return lastDotIndex > 0 ? name.slice(0, lastDotIndex) : name;
};



// Aggressive image resizing and compression
const resizeAndCompressImage = async (file: File, targetMaxSizeKB: number = 500): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = async () => {
      try {
        // Calculate aggressive resize dimensions
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        
        let { width, height } = img;
        
        // Aggressive downscaling for large images
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Further downscale if original file is very large (>2MB)
        if (file.size > 2 * 1024 * 1024) {
          const additionalScale = 0.7; // Reduce by 30% for very large files
          width = Math.floor(width * additionalScale);
          height = Math.floor(height * additionalScale);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Use high-quality image rendering
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Try multiple compression strategies to hit target size
        const compressionStrategies = [
          { format: 'image/webp', quality: 0.6 },
          { format: 'image/webp', quality: 0.5 },
          { format: 'image/webp', quality: 0.4 },
          { format: 'image/jpeg', quality: 0.7 },
          { format: 'image/jpeg', quality: 0.6 },
          { format: 'image/jpeg', quality: 0.5 },
        ];
        
        for (const strategy of compressionStrategies) {
          try {
            const blob = await new Promise<Blob | null>((resolveBlob) => {
              canvas.toBlob(resolveBlob, strategy.format, strategy.quality);
            });
            
            if (blob && blob.size <= targetMaxSizeKB * 1024) {
              const extension = strategy.format === 'image/webp' ? 'webp' : 'jpg';
              const compressedFile = new File(
                [blob], 
                `${getFileBaseName(file.name)}.${extension}`, 
                { type: strategy.format }
              );
              resolve(compressedFile);
              return;
            }
          } catch (e) {
            console.warn('Compression strategy failed:', strategy, e);
            continue;
          }
        }
        
        // If all strategies failed, try extreme compression
        try {
          const extremeBlob = await new Promise<Blob | null>((resolveBlob) => {
            canvas.toBlob(resolveBlob, 'image/jpeg', 0.3);
          });
          
          if (extremeBlob) {
            const extremeFile = new File(
              [extremeBlob], 
              `${getFileBaseName(file.name)}.jpg`, 
              { type: 'image/jpeg' }
            );
            resolve(extremeFile);
            return;
          }
        } catch (e) {
          console.warn('Extreme compression failed:', e);
        }
        
        // Last resort: return original
        resolve(file);
        
      } catch (error) {
        console.error('Image processing error:', error);
        resolve(file);
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image');
      resolve(file);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const compressOne = async (imageFile: File, showToasts = false): Promise<File> => {
  // Only process images
  if (!imageFile.type.startsWith("image/")) {
    return imageFile;
  }

  try {
    // Use the aggressive compression function silently
    const compressedFile = await resizeAndCompressImage(imageFile, 500);
    return compressedFile;
  } catch (error) {
    console.error("Compression failed:", error);
    return imageFile;
  }
};

export const compressMedia = async (files: File[], showToasts = false): Promise<File[]> => {
  return Promise.all(files.map((file) => compressOne(file, showToasts)));
};