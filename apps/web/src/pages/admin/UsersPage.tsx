import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RowSelectionState } from '@tanstack/react-table';
import {
  useUsers,
  useCreateUser,
  useBulkUpdateUsers,
  type CreateUserRequest,
} from '../../hooks/useUsers';
import { UserTable, BulkActions } from '../../components/admin';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const pageSize = 20;
  const { data, isLoading, error } = useUsers({ limit: pageSize, offset: page * pageSize });
  const createUser = useCreateUser();
  const bulkUpdate = useBulkUpdateUsers();

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const handleBulkActivate = () => {
    bulkUpdate.mutate(
      { userIds: selectedIds, update: { status: 'active' } },
      { onSuccess: () => setRowSelection({}) }
    );
  };

  const handleBulkDeactivate = () => {
    bulkUpdate.mutate(
      { userIds: selectedIds, update: { status: 'inactive' } },
      { onSuccess: () => setRowSelection({}) }
    );
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    const formData = new FormData(e.currentTarget);
    const userData: CreateUserRequest = {
      email: formData.get('email') as string,
      display_name: formData.get('display_name') as string,
    };

    const department = formData.get('department') as string;
    if (department) userData.department = department;

    const role = formData.get('global_role') as string;
    if (role) userData.global_role = role;

    try {
      await createUser.mutateAsync(userData);
      setShowCreateModal(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">{data ? `${data.total} total users` : 'Loading...'}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          Create User
        </button>
      </header>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.length}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        isLoading={bulkUpdate.isPending}
      />

      {/* Error State */}
      {error && <div className="error-banner">Failed to load users. Please try again.</div>}

      {/* Loading State */}
      {isLoading && <div className="loading-state">Loading users...</div>}

      {/* User Table */}
      {data && !isLoading && (
        <div className="table-card">
          <UserTable
            users={data.items}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onUserClick={(user) => navigate(`/users/${user.user_id}`)}
          />
        </div>
      )}

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {data.offset + 1} - {Math.min(data.offset + data.limit, data.total)} of{' '}
            {data.total}
          </span>
          <div className="pagination-buttons">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create User</h2>

            <form onSubmit={handleCreateUser}>
              <div className="form-fields">
                <div className="form-field">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="user@example.com"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="display_name">Display Name *</label>
                  <input
                    id="display_name"
                    name="display_name"
                    type="text"
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="department">Department</label>
                  <input id="department" name="department" type="text" placeholder="Engineering" />
                </div>

                <div className="form-field">
                  <label htmlFor="global_role">Role</label>
                  <select id="global_role" name="global_role">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {createError && <div className="error-banner">{createError}</div>}

              <div className="modal-actions">
                <button type="submit" disabled={createUser.isPending} className="btn btn-primary">
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
