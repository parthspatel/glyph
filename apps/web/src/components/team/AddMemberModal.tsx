import { useState } from "react";
import { useUsers } from "../../hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState("member");

  const { data: usersData } = useUsers({ limit: 100 });

  // Filter out existing members and match search
  const availableUsers =
    usersData?.items.filter(
      (user) =>
        !existingMemberIds.includes(user.user_id) &&
        (user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())),
    ) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId) {
      onAdd({ user_id: selectedUserId, role });
    }
  };

  const selectedUser = usersData?.items.find(
    (u) => u.user_id === selectedUserId,
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border shadow-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Add Team Member
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 flex flex-col flex-1 min-h-0"
        >
          {/* Search */}
          <div className="space-y-2">
            <label
              htmlFor="search"
              className="text-sm font-medium text-foreground"
            >
              Search Users
            </label>
            <Input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
            />
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] border rounded-md">
            {availableUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                {searchTerm ? "No users found" : "No available users"}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {availableUsers.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    onClick={() => setSelectedUserId(user.user_id)}
                    className={cn(
                      "w-full p-3 text-left transition-colors",
                      "hover:bg-muted/50",
                      selectedUserId === user.user_id && "bg-primary/10", // Selection uses purple (allowed for interactive elements)
                    )}
                  >
                    <p className="font-medium text-foreground">
                      {user.display_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected user and role */}
          {selectedUser && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Selected
                </p>
                <p className="font-medium text-foreground">
                  {selectedUser.display_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="role"
                  className="text-sm font-medium text-foreground"
                >
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedUserId || isLoading}>
              {isLoading ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
