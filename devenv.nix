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
  };

  packages = [
    pkgs.git
    pkgs.jq
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs;
  };

  scripts.gsd.exec = ''
    npx get-shit-done-cc@latest "$@"
  '';

  # https://devenv.sh/languages/
  languages.rust = {
    enable = true;
    toolchainFile = ./rust-toolchain.toml;
  };

  # https://devenv.sh/git-hooks/
  # git-hooks.hooks.shellcheck.enable = true;
  difftastic.enable = true;
  git-hooks.hooks = {
    nixfmt.enable = true;
    rustfmt.enable = true;
    clippy.enable = true;
    shfmt.enable = true;
    shellcheck.enable = true;
    action-validator.enable = true;
    commitizen.enable = true;
  };

  devcontainer.enable = true;

  claude.code = {
    enable = true;
    commands = {
      test = ''
        Run the test suite

        ```bash
        cargo test
        ```
      '';

      build = ''
        Build the project in release mode

        ```bash
        cargo build --release
        ```
      '';
    };
    hooks = {
      # Protect sensitive files (PreToolUse hook)
      protect-secrets = {
        enable = true;
        name = "Protect sensitive files";
        hookType = "PreToolUse";
        matcher = "^(Edit|MultiEdit|Write)$";
        command = ''
          # Read the JSON input from stdin
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
          fi
        '';
      };

      # # Type checking (PostToolUse hook)
      # typecheck = {
      #   enable = true;
      #   name = "Run type checking";
      #   hookType = "PostToolUse";
      #   matcher = "^(Edit|MultiEdit|Write)$";
      #   command = ''
      #     # Read the JSON input from stdin
      #     json=$(cat)
      #     file_path=$(echo "$json" | jq -r '.file_path // empty')

      #     if [[ "$file_path" =~ \.ts$ ]]; then
      #       npm run typecheck
      #     fi
      #   '';
      # };

      # # Log notifications (Notification hook)
      # log-notifications = {
      #   enable = true;
      #   name = "Log Claude notifications";
      #   hookType = "Notification";
      #   command = ''echo "Claude notification received" >> claude.log'';
      # };

      # # Track completion (Stop hook)
      # track-completion = {
      #   enable = true;
      #   name = "Track when Claude finishes";
      #   hookType = "Stop";
      #   command = ''echo "Claude finished at $(date)" >> claude-sessions.log'';
      # };

      # # Subagent monitoring (SubagentStop hook)
      # subagent-complete = {
      #   enable = true;
      #   name = "Log subagent completion";
      #   hookType = "SubagentStop";
      #   command = ''echo "Subagent task completed" >> subagent.log'';
      # };
    };
  };
}
