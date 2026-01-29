-- Migration 0010: Add 'deleted' value to user_status enum
-- This enables soft-delete functionality for users

ALTER TYPE user_status ADD VALUE 'deleted';
