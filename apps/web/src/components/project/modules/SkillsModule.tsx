/**
 * SkillsModule - displays required skills and provides multi-select modal.
 */

import * as React from "react";
import { Award, Check } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Available skills - matching the pattern from SkillRequirementsSection
const AVAILABLE_SKILLS = [
  { id: "ner", name: "Named Entity Recognition" },
  { id: "sentiment", name: "Sentiment Analysis" },
  { id: "classification", name: "Text Classification" },
  { id: "summarization", name: "Summarization" },
  { id: "medical", name: "Medical Terminology" },
  { id: "legal", name: "Legal Document Analysis" },
  { id: "translation", name: "Translation" },
  { id: "image_labeling", name: "Image Labeling" },
  { id: "audio_transcription", name: "Audio Transcription" },
  { id: "data_entry", name: "Data Entry" },
];

export interface Skill {
  skill_id: string;
  name: string;
}

export interface SkillsModuleProps {
  projectId: string;
  requiredSkills: Skill[];
  onUpdate: (skillIds: string[]) => Promise<void>;
}

export function SkillsModule({
  projectId: _projectId,
  requiredSkills,
  onUpdate,
}: SkillsModuleProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(requiredSkills.map((s) => s.skill_id));
    }
  }, [open, requiredSkills]);

  const toggleSkill = (skillId: string) => {
    setSelectedIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(selectedIds);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update skills:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Build preview with max 3 badges
  const maxVisible = 3;
  const visibleSkills = requiredSkills.slice(0, maxVisible);
  const remainingCount = requiredSkills.length - maxVisible;

  const preview =
    requiredSkills.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {visibleSkills.map((skill) => (
          <Badge key={skill.skill_id} variant="secondary" className="text-xs">
            {skill.name}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    ) : null;

  return (
    <>
      <ModuleCard
        title="Required Skills"
        icon={<Award />}
        status={requiredSkills.length > 0 ? "configured" : "unconfigured"}
        preview={preview}
        emptyText="No skills required"
        emptyAction="Add Skills"
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Required Skills</DialogTitle>
            <DialogDescription>
              Select skills that annotators must have to work on this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 max-h-64 overflow-y-auto py-2">
            {AVAILABLE_SKILLS.map((skill) => {
              const isSelected = selectedIds.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-left",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "size-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-input",
                    )}
                  >
                    {isSelected && (
                      <Check className="size-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="text-sm text-foreground">{skill.name}</span>
                </button>
              );
            })}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedIds.length} skills selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Clear all
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
