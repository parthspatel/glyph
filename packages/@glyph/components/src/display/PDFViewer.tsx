import React from 'react';

export interface PDFViewerProps {
  src: string;
  page?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
}

export function PDFViewer({
  src,
  page = 1,
  onPageChange,
  totalPages,
}: PDFViewerProps): React.ReactElement {
  return (
    <div className="pdf-viewer">
      {totalPages && onPageChange && (
        <div className="pdf-viewer__controls">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
      <iframe
        src={`${src}#page=${page}`}
        className="pdf-viewer__frame"
        title="PDF Document"
      />
    </div>
  );
}
