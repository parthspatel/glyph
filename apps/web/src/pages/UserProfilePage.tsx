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
      <div className="page-container">
        <div className="loading-skeleton">
          <div className="skeleton-header">
            <div className="skeleton-avatar" />
            <div className="skeleton-text-group">
              <div className="skeleton-text skeleton-text-lg" />
              <div className="skeleton-text skeleton-text-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-container">
        <div className="error-banner">
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

  return (
    <div className="page-container">
      {/* Header with avatar and name */}
      <header className="profile-header">
        <div className="profile-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} />
          ) : (
            <span className="avatar-placeholder">
              {user.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="profile-info">
          <div className="profile-title-row">
            <h1>{user.display_name}</h1>
            <span className={`role-badge role-${user.global_role}`}>
              {user.global_role}
            </span>
            <span className={`status-badge status-${user.status}`}>
              {user.status}
            </span>
          </div>
          <p className="profile-email">{user.email}</p>
          {user.department && (
            <p className="profile-department">{user.department}</p>
          )}
          {user.timezone && (
            <p className="profile-timezone">Timezone: {user.timezone}</p>
          )}

          {canEdit && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn btn-link">
              Edit Profile
            </button>
          )}
        </div>
      </header>

      {/* Edit form */}
      {isEditing && (
        <section className="edit-form-section">
          <h2>Edit Profile</h2>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="display_name">Display Name</label>
              <input
                id="display_name"
                type="text"
                defaultValue={user.display_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, display_name: e.target.value }))
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="department">Department</label>
              <input
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

            <div className="form-field">
              <label htmlFor="timezone">Timezone</label>
              <input
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

            <div className="form-field">
              <label htmlFor="avatar_url">Avatar URL</label>
              <input
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

            <div className="form-field form-field-full">
              <label htmlFor="bio">Bio</label>
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
              />
            </div>
          </div>

          {updateUser.error && (
            <div className="error-banner">{updateUser.error.message}</div>
          )}

          <div className="form-actions">
            <button
              onClick={handleSave}
              disabled={updateUser.isPending}
              className="btn btn-primary"
            >
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={updateUser.isPending}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Bio section */}
      {user.bio && !isEditing && (
        <section className="profile-section">
          <h2>About</h2>
          <p className="bio-text">{user.bio}</p>
        </section>
      )}

      {/* Contact info */}
      {user.contact_info &&
        (user.contact_info.phone ||
          user.contact_info.slack_handle ||
          user.contact_info.office_location) && (
          <section className="profile-section">
            <h2>Contact</h2>
            <dl className="contact-list">
              {user.contact_info.phone && (
                <div className="contact-item">
                  <dt>Phone</dt>
                  <dd>{user.contact_info.phone}</dd>
                </div>
              )}
              {user.contact_info.slack_handle && (
                <div className="contact-item">
                  <dt>Slack</dt>
                  <dd>{user.contact_info.slack_handle}</dd>
                </div>
              )}
              {user.contact_info.office_location && (
                <div className="contact-item">
                  <dt>Office</dt>
                  <dd>{user.contact_info.office_location}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

      {/* Skills section */}
      <section className="profile-section">
        <h2>Skills & Certifications</h2>
        <SkillBadges skills={skills || []} />
      </section>

      {/* Quality metrics section */}
      <section className="profile-section">
        <h2>Quality Metrics</h2>
        <QualityStats profile={user.quality_profile} />
      </section>

      {/* Metadata footer */}
      <footer className="profile-footer">
        <p>Member since {new Date(user.created_at).toLocaleDateString()}</p>
        <p>Last updated {new Date(user.updated_at).toLocaleDateString()}</p>
      </footer>
    </div>
  );
}
