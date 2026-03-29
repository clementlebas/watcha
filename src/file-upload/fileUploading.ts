import { createFile } from 'wasp/client/operations';
import axios from 'axios';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from './validation';

export type FileWithValidType = Omit<File, 'type'> & { type: AllowedFileType };
type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number];
interface FileUploadProgress {
  file: FileWithValidType;
  setUploadProgressPercent: (percentage: number) => void;
}

export async function uploadFileWithProgress({ file, setUploadProgressPercent }: FileUploadProgress) {
  // @ts-ignore
  const { s3UploadUrl, s3UploadFields, fileId } = await createFile({ fileType: file.type, fileName: file.name });

  const formData = getFileUploadFormData(file, s3UploadFields);

  return new Promise<{ fileId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        setUploadProgressPercent(percentage);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ fileId });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload'));
    };

    xhr.open('POST', s3UploadUrl, true);
    xhr.send(formData);
  });

  // @ts-ignore
  return { fileId };
}

function getFileUploadFormData(file: File, s3UploadFields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(s3UploadFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);
  return formData;
}

export interface FileUploadError {
  message: string;
  code: 'NO_FILE' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'UPLOAD_FAILED';
}

export function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      message: `File size exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.`,
      code: 'FILE_TOO_LARGE' as const,
    };
  }

  if (!isAllowedFileType(file.type)) {
    return {
      message: `File type '${file.type}' is not supported.`,
      code: 'INVALID_FILE_TYPE' as const,
    };
  }

  return null;
}

function isAllowedFileType(fileType: string): fileType is AllowedFileType {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(fileType);
}
