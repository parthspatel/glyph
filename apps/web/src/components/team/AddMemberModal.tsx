import { useState } from 'react';
import { useUsers } from '../../hooks/useUsers';

interface AddMemberModalProps {
  onAdd: (data: { user_id: string; role: string }) => void;
  onClose: () => void;
  isLoading: boolean;
  existingMemberIds: string[];
}

export function AddMemberModal({
  onAdd,
  onClose,
  isLoading,
  existingMemberIds,
}: AddMemberModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState('member');

  const { data: usersData } = useUsers({ limit: 100 });

  // Filter out existing members and match search
  const availableUsers =
    usersData?.items.filter(
      (user) =>
        !existingMemberIds.includes(user.user_id) &&
        (user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId) {
      onAdd({ user_id: selectedUserId, role });
    }
  };

  const selectedUser = usersData?.items.find((u) => u.user_id === selectedUserId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <h2>Add Team Member</h2>

        <form onSubmit={handleSubmit}>
          {/* Search */}
          <div className="form-field">
            <label htmlFor="search">Search Users</label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
            />
          </div>

          {/* User list */}
          <div className="user-select-list">
            {availableUsers.length === 0 ? (
              <p className="text-muted text-center">
                {searchTerm ? 'No users found' : 'No available users'}
              </p>
            ) : (
              <div className="user-select-items">
                {availableUsers.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    onClick={() => setSelectedUserId(user.user_id)}
                    className={`user-select-item ${
                      selectedUserId === user.user_id ? 'selected' : ''
                    }`}
                  >
                    <p className="user-select-name">{user.display_name}</p>
                    <p className="user-select-email">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected user and role */}
          {selectedUser && (
            <div className="selected-user-preview">
              <p className="preview-label">Selected:</p>
              <p className="preview-name">{selectedUser.display_name}</p>
              <p className="preview-email">{selectedUser.email}</p>

              <div className="form-field">
                <label htmlFor="role">Role</label>
                <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="submit"
              disabled={!selectedUserId || isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Adding...' : 'Add Member'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
