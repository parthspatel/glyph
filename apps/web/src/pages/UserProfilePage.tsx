import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useUser,
  useUpdateUser,
  useCurrentUser,
  useUserSkills,
  type UpdateUserRequest,
} from "../hooks/useUser";
import { SkillBadges, QualityStats } from "../components/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading, error } = useUser(userId!);
  const { data: skills } = useUserSkills(userId!);
  const { data: currentUser } = useCurrentUser();
  const updateUser = useUpdateUser(userId!);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserRequest>({});

  const canEdit =
    currentUser?.user_id === userId || currentUser?.global_role === "admin";

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex gap-6 items-start">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load user profile. Please try again.
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync(editForm);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const roleColors: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    manager: "bg-info/10 text-info",
    annotator: "bg-muted text-muted-foreground",
  };

  const statusColors: Record<string, string> = {
    active: "bg-success/10 text-success",
    inactive: "bg-muted text-muted-foreground",
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with avatar and name */}
      <header className="flex gap-6 items-start">
        <div className="size-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold overflow-hidden">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground">
              {user.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">
              {user.display_name}
            </h1>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                roleColors[user.global_role] || roleColors.annotator,
              )}
            >
              {user.global_role}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                statusColors[user.status] || statusColors.inactive,
              )}
            >
              {user.status}
            </span>
          </div>
          <p className="text-muted-foreground">{user.email}</p>
          {user.department && (
            <p className="text-sm text-muted-foreground">{user.department}</p>
          )}
          {user.timezone && (
            <p className="text-sm text-muted-foreground">
              Timezone: {user.timezone}
            </p>
          )}

          {canEdit && !isEditing && (
            <Button
              variant="link"
              onClick={() => setIsEditing(true)}
              className="px-0"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </header>

      {/* Edit form */}
      {isEditing && (
        <section className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Edit Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="display_name"
                className="text-sm font-medium text-foreground"
              >
                Display Name
              </label>
              <Input
                id="display_name"
                type="text"
                defaultValue={user.display_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, display_name: e.target.value }))
                }
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
                type="text"
                defaultValue={user.department || ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    department: e.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="timezone"
                className="text-sm font-medium text-foreground"
              >
                Timezone
              </label>
              <Input
                id="timezone"
                type="text"
                defaultValue={user.timezone || ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    timezone: e.target.value || undefined,
                  }))
                }
                placeholder="e.g., America/New_York"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="avatar_url"
                className="text-sm font-medium text-foreground"
              >
                Avatar URL
              </label>
              <Input
                id="avatar_url"
                type="url"
                defaultValue={user.avatar_url || ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    avatar_url: e.target.value || undefined,
                  }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="bio"
                className="text-sm font-medium text-foreground"
              >
                Bio
              </label>
              <textarea
                id="bio"
                defaultValue={user.bio || ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    bio: e.target.value || undefined,
                  }))
                }
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {updateUser.error && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
              {updateUser.error.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={updateUser.isPending}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}

      {/* Bio section */}
      {user.bio && !isEditing && (
        <section className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">About</h2>
          <p className="text-foreground">{user.bio}</p>
        </section>
      )}

      {/* Contact info */}
      {user.contact_info &&
        (user.contact_info.phone ||
          user.contact_info.slack_handle ||
          user.contact_info.office_location) && (
          <section className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <dl>
              {user.contact_info.phone && (
                <div className="flex justify-between py-2 border-b border-border last:border-0">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{user.contact_info.phone}</dd>
                </div>
              )}
              {user.contact_info.slack_handle && (
                <div className="flex justify-between py-2 border-b border-border last:border-0">
                  <dt className="text-muted-foreground">Slack</dt>
                  <dd className="text-foreground">
                    {user.contact_info.slack_handle}
                  </dd>
                </div>
              )}
              {user.contact_info.office_location && (
                <div className="flex justify-between py-2 border-b border-border last:border-0">
                  <dt className="text-muted-foreground">Office</dt>
                  <dd className="text-foreground">
                    {user.contact_info.office_location}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

      {/* Skills section */}
      <section className="bg-card rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Skills & Certifications
        </h2>
        <SkillBadges skills={skills || []} />
      </section>

      {/* Quality metrics section */}
      <section className="bg-card rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Quality Metrics
        </h2>
        <QualityStats profile={user.quality_profile} />
      </section>

      {/* Metadata footer */}
      <footer className="text-sm text-muted-foreground space-y-1">
        <p>Member since {new Date(user.created_at).toLocaleDateString()}</p>
        <p>Last updated {new Date(user.updated_at).toLocaleDateString()}</p>
      </footer>
    </div>
  );
}
