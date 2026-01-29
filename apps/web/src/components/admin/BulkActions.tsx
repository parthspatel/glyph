interface BulkActionsProps {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  isLoading: boolean;
}

export function BulkActions({
  selectedCount,
  onActivate,
  onDeactivate,
  isLoading,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-actions">
      <span className="bulk-count">
        {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
      </span>
      <div className="bulk-buttons">
        <button onClick={onActivate} disabled={isLoading} className="btn btn-success btn-sm">
          {isLoading ? 'Updating...' : 'Activate'}
        </button>
        <button onClick={onDeactivate} disabled={isLoading} className="btn btn-secondary btn-sm">
          {isLoading ? 'Updating...' : 'Deactivate'}
        </button>
      </div>
    </div>
  );
}
