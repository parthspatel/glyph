/**
 * Basic information section for project form.
 * Contains name, description, tags, and documentation.
 */

import { useFormContext } from "react-hook-form";
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BasicInfoSection() {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();
  const [tagInput, setTagInput] = useState("");
  const tags = watch("tags") || [];

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setValue("tags", [...tags, trimmed], { shouldDirty: true });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t: string) => t !== tag),
      { shouldDirty: true },
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const inputClasses =
    "w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const textareaClasses = cn(inputClasses, "min-h-[80px] resize-y");

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm font-medium text-foreground block"
        >
          Project Name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className={cn(
            inputClasses,
            errors.name && "border-destructive focus:ring-destructive",
          )}
          placeholder="Enter project name"
        />
        {errors.name && (
          <p className="text-sm text-destructive">
            {errors.name.message as string}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label
          htmlFor="description"
          className="text-sm font-medium text-foreground block"
        >
          Description
        </label>
        <textarea
          id="description"
          {...register("description")}
          className={textareaClasses}
          placeholder="Brief description of the project"
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground block">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 p-2 rounded-md border border-input bg-background min-h-[42px]">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm bg-primary/10 text-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="size-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
            placeholder="Add tag and press Enter"
          />
        </div>
      </div>

      {/* Documentation */}
      <div className="space-y-2">
        <label
          htmlFor="documentation"
          className="text-sm font-medium text-foreground block"
        >
          Documentation
        </label>
        <textarea
          id="documentation"
          {...register("documentation")}
          className={textareaClasses}
          placeholder="Detailed documentation, guidelines, or instructions for annotators"
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown formatting
        </p>
      </div>

      {/* Deadline */}
      <div className="flex gap-4">
        <div className="space-y-2 flex-1">
          <label
            htmlFor="deadline"
            className="text-sm font-medium text-foreground block"
          >
            Deadline
          </label>
          <input
            id="deadline"
            type="date"
            {...register("deadline")}
            className={inputClasses}
          />
        </div>
        <div className="space-y-2 flex-1">
          <label
            htmlFor="deadline_action"
            className="text-sm font-medium text-foreground block"
          >
            Deadline Action
          </label>
          <select
            id="deadline_action"
            {...register("deadline_action")}
            className={cn(inputClasses, "cursor-pointer")}
          >
            <option value="">None</option>
            <option value="notify">Notify</option>
            <option value="pause">Pause Project</option>
            <option value="escalate">Escalate</option>
          </select>
        </div>
      </div>
    </div>
  );
}
