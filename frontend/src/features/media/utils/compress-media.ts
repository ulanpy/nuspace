export const compressMedia = async (files: File[]): Promise<File[]> => {
    return Promise.all(
        files.map(async (imageFile) => {
        return new Promise<File>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                const file = new File([blob], 'compressed.webp', { type: 'image/webp' });
                resolve(file);
                } else {
                reject(new Error("Failed to compress image"));
                }
            }, 'image/webp', 0.03);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(imageFile);
        });
        })
    );
    };