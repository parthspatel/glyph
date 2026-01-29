{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  env = {
    NPM_CONFIG_CACHE = ".devenv/npm-cache";
    NPM_CONFIG_PREFIX = ".devenv/npm-global";
    DATABASE_URL = "postgres://glyph:glyph@localhost:5432/glyph";
    REDIS_URL = "redis://localhost:6379";
  };

  packages = [
    pkgs.git
    pkgs.jq
    pkgs.sqlx-cli
    pkgs.pnpm
  ];

  # JavaScript/TypeScript with pnpm
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm = {
      enable = true;
      install.enable = true;
    };
  };

  # Rust
  languages.rust = {
    enable = true;
    toolchainFile = ./rust-toolchain.toml;
  };

  # Python for ML services
  # languages.python = {
  #   enable = true;
  #   version = "3.12";
  #   uv = {
  #     enable = true;
  #     sync.enable = true;
  #   };
  # };

  # PostgreSQL
  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    initialDatabases = [
      { name = "glyph"; }
    ];
    initialScript = ''
      CREATE USER glyph WITH PASSWORD 'glyph' SUPERUSER;
      GRANT ALL PRIVILEGES ON DATABASE glyph TO glyph;
    '';
    listen_addresses = "127.0.0.1";
    port = 5432;
  };

  # Redis
  services.redis = {
    enable = true;
    port = 6379;
  };

  # Custom scripts
  scripts = {
    gsd.exec = ''
      npx get-shit-done-cc@latest "$@"
    '';

    db-migrate.exec = ''
      sqlx migrate run --source migrations/
    '';

    db-reset.exec = ''
      sqlx database drop -y || true
      sqlx database create
      sqlx migrate run --source migrations/
    '';

    dev-api.exec = ''
      cargo run --package glyph-api
    '';

    dev-worker.exec = ''
      cargo run --package glyph-worker
    '';

    dev-web.exec = ''
      pnpm --filter @glyph/web dev
    '';

    dev.exec = ''
      API_PID=""
      WEB_PID=""

      cleanup() {
        echo ""
        echo "Shutting down..."
        [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null
        [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null
        # Kill any child processes that might have spawned
        pkill -f "glyph-api" 2>/dev/null
        pkill -f "@glyph/web" 2>/dev/null
        exit 0
      }

      trap cleanup INT TERM

      echo "Starting development servers..."
      echo "API: http://localhost:3000"
      echo "Web: http://localhost:5173"

      cargo run --package glyph-api &
      API_PID=$!

      pnpm --filter @glyph/web dev &
      WEB_PID=$!

      wait
    '';

    typegen.exec = ''
      typeshare --lang typescript --output-file packages/@glyph/types/src/generated.ts libs/
    '';
  };

  # Git hooks
  difftastic.enable = true;
  git-hooks.hooks = {
    nixfmt.enable = true;
    rustfmt.enable = true;
    # clippy.enable = true;
    shfmt.enable = true;
    shellcheck.enable = true;
    action-validator.enable = true;
    commitizen.enable = true;
  };

  # Claude Code integration
  claude.code = {
    enable = true;
    commands = {
      test = ''
        Run the test suite

        ```bash
        cargo test
        pnpm test
        ```
      '';

      build = ''
        Build the project in release mode

        ```bash
        cargo build --release
        pnpm build
        ```
      '';

      migrate = ''
        Run database migrations

        ```bash
        sqlx migrate run --source migrations/
        ```
      '';
    };
    hooks = {
      protect-secrets = {
        enable = true;
        name = "Protect sensitive files";
        hookType = "PreToolUse";
        matcher = "^(Edit|MultiEdit|Write)$";
        command = ''
          json=$(cat)
          file_path=$(echo "$json" | jq -r '.file_path // empty')

          if [[ "$file_path" =~ \.(env|secret)$ ]]; then
            echo "Error: Cannot edit sensitive files"
            exit 1
          fi
        '';
      };

      # Run tests after changes (PostToolUse hook)
      test-on-save = {
        enable = true;
        name = "Run tests after edit";
        hookType = "PostToolUse";
        matcher = "^(Edit|MultiEdit|Write)$";
        command = ''
          # Read the JSON input from stdin
          json=$(cat)
          file_path=$(echo "$json" | jq -r '.file_path // empty')

          if [[ "$file_path" =~ \.rs$ ]]; then
            cargo test
          elif [[ "$file_path" =~ \.(ts|tsx)$ ]]; then
            pnpm test
          fi
        '';
      };
    };
  };
}
