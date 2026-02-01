import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  useUsers,
  useCreateUser,
  useBulkUpdateUsers,
  type CreateUserRequest,
} from "../../hooks/useUsers";
import { UserTable, BulkActions } from "../../components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const pageSize = 20;
  const { data, isLoading, error } = useUsers({
    limit: pageSize,
    offset: page * pageSize,
  });
  const createUser = useCreateUser();
  const bulkUpdate = useBulkUpdateUsers();

  const selectedIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id],
  );

  const handleBulkActivate = () => {
    bulkUpdate.mutate(
      { userIds: selectedIds, update: { status: "active" } },
      { onSuccess: () => setRowSelection({}) },
    );
  };

  const handleBulkDeactivate = () => {
    bulkUpdate.mutate(
      { userIds: selectedIds, update: { status: "inactive" } },
      { onSuccess: () => setRowSelection({}) },
    );
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    const formData = new FormData(e.currentTarget);
    const userData: CreateUserRequest = {
      email: formData.get("email") as string,
      display_name: formData.get("display_name") as string,
    };

    const department = formData.get("department") as string;
    if (department) userData.department = department;

    const role = formData.get("global_role") as string;
    if (role) userData.global_role = role;

    try {
      await createUser.mutateAsync(userData);
      setShowCreateModal(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create user",
      );
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">
            {data ? `${data.total} total users` : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create User</Button>
      </header>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.length}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        isLoading={bulkUpdate.isPending}
      />

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load users. Please try again.
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading users...
        </div>
      )}

      {/* User Table */}
      {data && !isLoading && (
        <div className="bg-card rounded-lg border overflow-hidden">
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
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Showing {data.offset + 1} -{" "}
            {Math.min(data.offset + data.limit, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-card rounded-lg border shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Create User
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="display_name"
                  className="text-sm font-medium text-foreground"
                >
                  Display Name *
                </label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="department"
                  className="text-sm font-medium text-foreground"
                >
                  Department
                </label>
                <Input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="Engineering"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="global_role"
                  className="text-sm font-medium text-foreground"
                >
                  Role
                </label>
                <select
                  id="global_role"
                  name="global_role"
                  className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {createError && (
                <div className="text-sm text-destructive">{createError}</div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
