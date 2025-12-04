import { FileText, Image, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { InvoiceAttachment } from '../../types';

interface AttachmentListProps {
  attachments: InvoiceAttachment[];
  onDownload: (attachment: InvoiceAttachment) => void;
  onDelete?: (attachment: InvoiceAttachment) => void;
  isDeleting?: number | null; // ID of attachment being deleted
  canDelete?: boolean;
}

export function AttachmentList({
  attachments,
  onDownload,
  onDelete,
  isDeleting,
  canDelete = false,
}: AttachmentListProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-red-500" />;
  };

  const getFileTypeLabel = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/tiff': 'TIFF',
    };
    return typeMap[mimeType] || 'File';
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No attachments</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 border rounded-lg">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-3 hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {getFileIcon(attachment.mime_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.filename}
              </p>
              <p className="text-xs text-gray-500">
                {getFileTypeLabel(attachment.mime_type)} &bull; {formatFileSize(attachment.file_size)}
                {attachment.created_at && (
                  <> &bull; {formatDate(attachment.created_at)}</>
                )}
              </p>
              {attachment.description && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {attachment.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDownload(attachment)}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>

            {canDelete && onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(attachment)}
                disabled={isDeleting === attachment.id}
                title="Delete"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting === attachment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
