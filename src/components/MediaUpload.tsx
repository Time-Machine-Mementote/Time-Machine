import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaFile } from '@/utils/journalStorage';

interface MediaUploadProps {
  onFilesChange: (files: MediaFile[]) => void;
  existingFiles?: MediaFile[];
  maxFiles?: number;
}

const MediaUpload = ({ onFilesChange, existingFiles = [], maxFiles = 5 }: MediaUploadProps) => {
  const [files, setFiles] = useState<MediaFile[]>(existingFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File): Promise<MediaFile> => {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('File size must be less than 10MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const mediaFile: MediaFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: result,
        };

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          mediaFile.preview = result;
        }

        resolve(mediaFile);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    const remainingSlots = maxFiles - files.length;
    const filesToProcess = fileArray.slice(0, remainingSlots);

    try {
      const processedFiles = await Promise.all(
        filesToProcess.map(file => processFile(file))
      );

      const newFiles = [...files, ...processedFiles];
      setFiles(newFiles);
      onFilesChange(newFiles);
    } catch (error) {
      console.error('Error processing files:', error);
      alert(error instanceof Error ? error.message : 'Failed to process files');
    }
  }, [files, maxFiles, onFilesChange, processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const canAddMore = files.length < maxFiles;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-crimson font-semibold text-foreground">
          Media Files
        </h3>
        <span className="text-sm text-muted-foreground">
          {files.length}/{maxFiles} files
        </span>
      </div>

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            isDragOver 
              ? 'border-primary bg-primary/5 scale-105' 
              : 'border-border hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground mb-2">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Images, videos, and documents up to 10MB each
          </p>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ethereal"
          >
            Choose Files
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Uploaded Files</h4>
          <div className="grid gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file.type}
                  </p>
                </div>

                <Button
                  onClick={() => removeFile(file.id)}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;