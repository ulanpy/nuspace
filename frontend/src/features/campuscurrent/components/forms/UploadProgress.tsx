import React from 'react';
import { useEventForm } from '../../../../context/EventFormContext';

interface UploadProgressProps {
  isUploading: boolean;
  uploadProgress: number;
}

export function UploadProgress({ isUploading, uploadProgress }: UploadProgressProps) {
  const { isEditMode } = useEventForm();

  if (!isUploading) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{isEditMode ? 'Updating' : 'Creating'} event...</span>
        <span>{uploadProgress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
    </div>
  );
}