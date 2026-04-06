import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLanguage } from '../contexts/LanguageContext';
import { Upload, FileSpreadsheet, File, AlertCircle, X } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';

const fileTypeIcons = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  json: File,
  parquet: File
};

const fileTypeBadges = {
  csv: 'file-badge-csv',
  xlsx: 'file-badge-xlsx',
  xls: 'file-badge-xls',
  json: 'file-badge-json',
  parquet: 'file-badge-parquet'
};

export const FileUpload = ({ onUpload, isUploading, uploadProgress, error, maxSizeMB = 5 }) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      return;
    }
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/octet-stream': ['.parquet']
    },
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: isUploading
  });

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full" data-testid="file-upload-container">
      {/* Dropzone */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          data-testid="upload-dropzone"
          className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragActive 
              ? 'border-primary bg-primary/10 dropzone-active' 
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} data-testid="file-input" />
          
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDragActive ? 'bg-primary/20' : 'bg-muted'
            }`}>
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold tracking-tight mb-2">
                {isDragActive ? 'Suelta tu archivo aquí' : t('dashboard.dragDrop')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.supportedFormats')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && !isUploading && (
        <div className="border border-border rounded-xl p-6" data-testid="selected-file-preview">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {React.createElement(fileTypeIcons[getFileExtension(selectedFile.name)] || File, {
                className: 'w-12 h-12 text-muted-foreground'
              })}
              <div>
                <p className="font-medium text-lg">{selectedFile.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`file-badge ${fileTypeBadges[getFileExtension(selectedFile.name)] || ''}`}>
                    {getFileExtension(selectedFile.name).toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={clearFile} data-testid="clear-file-btn">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button onClick={handleUpload} className="flex-1" data-testid="upload-btn">
              <Upload className="w-4 h-4 mr-2" />
              Analizar archivo
            </Button>
            <Button variant="outline" onClick={clearFile} data-testid="cancel-btn">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Uploading state */}
      {isUploading && (
        <div className="border border-border rounded-xl p-6" data-testid="uploading-state">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-medium">{t('dashboard.analyzing')}</p>
              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
            </div>
          </div>
          <Progress value={uploadProgress} className="h-2" data-testid="upload-progress" />
          <p className="text-xs text-muted-foreground mt-2 text-center">{uploadProgress}%</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3" data-testid="upload-error">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">{t('common.error')}</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg" data-testid="file-rejection-error">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Archivo no válido</p>
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name} className="text-sm text-destructive/80">
                  {errors.map((e) => (
                    <p key={e.code}>
                      {e.code === 'file-too-large' 
                        ? `El archivo excede el límite de ${maxSizeMB}MB`
                        : e.code === 'file-invalid-type'
                        ? 'Tipo de archivo no soportado'
                        : e.message}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
