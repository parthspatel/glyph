-- Add 'deleted' value to project_status enum for soft delete support
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'deleted';
