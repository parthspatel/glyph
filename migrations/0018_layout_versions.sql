-- Layout versioning schema
-- Layouts define how annotation tasks are presented to annotators.
-- Versions follow a draft -> published -> deprecated lifecycle.

-- Layout status enum
CREATE TYPE layout_status AS ENUM ('draft', 'published', 'deprecated');

-- Template format enum
CREATE TYPE template_format AS ENUM ('nunjucks', 'mdx', 'tsx');

-- Layouts table (header entity)
CREATE TABLE layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type_id UUID REFERENCES project_types(project_type_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Layout versions table (immutable once published)
CREATE TABLE layout_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    status layout_status NOT NULL DEFAULT 'draft',
    template_format template_format NOT NULL DEFAULT 'nunjucks',
    content TEXT NOT NULL,
    input_schema JSONB,
    output_schema JSONB,
    settings JSONB NOT NULL DEFAULT '{}',
    allowed_components TEXT[] DEFAULT '{}',
    shortcuts JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(user_id),

    -- Unique version string per layout
    UNIQUE (layout_id, version)
);

-- Indexes
CREATE INDEX idx_layout_versions_layout_id ON layout_versions(layout_id);
CREATE INDEX idx_layout_versions_status ON layout_versions(status);
CREATE INDEX idx_layouts_project_type ON layouts(project_type_id);

-- Trigger to prevent editing published/deprecated versions
CREATE OR REPLACE FUNCTION prevent_published_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'draft' AND (
        NEW.content IS DISTINCT FROM OLD.content OR
        NEW.input_schema IS DISTINCT FROM OLD.input_schema OR
        NEW.output_schema IS DISTINCT FROM OLD.output_schema OR
        NEW.settings IS DISTINCT FROM OLD.settings OR
        NEW.allowed_components IS DISTINCT FROM OLD.allowed_components OR
        NEW.shortcuts IS DISTINCT FROM OLD.shortcuts
    ) THEN
        RAISE EXCEPTION 'Cannot edit published or deprecated layout versions';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER layout_version_immutable
    BEFORE UPDATE ON layout_versions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_published_edit();

-- Trigger to update layouts.updated_at when versions change
CREATE OR REPLACE FUNCTION update_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE layouts SET updated_at = NOW() WHERE id = NEW.layout_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER layout_version_update_timestamp
    AFTER INSERT OR UPDATE ON layout_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_layout_timestamp();
