# File Hider

A VS Code extension that automatically hides clutter files and directories from the explorer, reducing visual noise in your projects.

## Features

- **Built-in hide rules** – comes with rules for common clutter files:
  - Empty `__init__.py` (Python files that are empty or whitespace-only)
  - `.DS_Store` (macOS metadata)
  - `__pycache__` (Python bytecode cache)
  - `Thumbs.db` (Windows thumbnail cache)
  - `desktop.ini` (Windows folder settings)
  - `.pytest_cache` (pytest cache)
  - `.mypy_cache` (mypy cache)
  - `*.egg-info` (Python egg-info directories)
- **Custom glob patterns** – add your own patterns (e.g. `**/.env.local`, `**/dist`) to hide any files or folders you like.
- **Sidebar panel** – a dedicated activity bar view to browse, toggle, and manage hide rules and custom patterns.
- **Live updates** – watches for file creation, modification, and deletion. Files reappear automatically when they no longer match a rule.
- **Toggle on/off** – enable or disable all hiding via the status bar, commands, or settings.
- **Manual refresh** – run the refresh command to rescan the workspace at any time.
- **First-run setup** – prompts you to select which rules to activate when the extension is first installed.

## Commands

| Command | Description |
|---|---|
| `File Hider: Enable` | Turns on hiding and performs an immediate scan. |
| `File Hider: Disable` | Unhides all managed files and turns off hiding. |
| `File Hider: Toggle On/Off` | Toggles hiding on or off. |
| `File Hider: Refresh Hidden Files` | Rescans the workspace and updates hidden files. |
| `File Hider: Select Rules to Apply` | Opens a quick-pick to choose which built-in rules are active. |

## Extension Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `fileHider.enabled` | `boolean` | `true` | Master switch – enable or disable all file hiding. |
| `fileHider.activeRules` | `string[]` | `[]` | List of active built-in rule IDs. Available: `emptyInitPy`, `dsStore`, `pycache`, `thumbsDb`, `desktopIni`, `pytest_cache`, `mypy_cache`, `egg_info`. |
| `fileHider.customPatterns` | `string[]` | `[]` | Additional glob patterns to hide (e.g. `**/.env.local`, `**/dist`). |

## How It Works

The extension adds workspace-level `files.exclude` entries for each file or folder matching your active rules and custom patterns. It tracks which entries it manages so it never touches exclusions you've set yourself. When you disable the extension, deactivate a rule, or a file no longer matches (e.g. an `__init__.py` gains content), the corresponding exclusion is automatically removed.
