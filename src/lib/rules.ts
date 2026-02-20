import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Hide-rule type
// ---------------------------------------------------------------------------

export interface HideRule {
	/** Unique identifier stored in settings */
	id: string;
	/** Human-readable label shown in quick-pick */
	label: string;
	/** Description shown in quick-pick */
	description: string;
	/** Glob pattern used with workspace.findFiles */
	glob: string;
	/**
	 * When set, only files that pass this check are hidden.
	 * This allows rules like "empty __init__.py" where the glob alone
	 * is not enough.
	 */
	filter?: (uri: vscode.Uri) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/**
 * Check whether a file is empty (0 bytes) or contains only whitespace.
 */
async function isFileEmpty(uri: vscode.Uri): Promise<boolean> {
	try {
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.size === 0) {
			return true;
		}
		if (stat.size <= 256) {
			const content = await vscode.workspace.fs.readFile(uri);
			const text = Buffer.from(content).toString('utf-8');
			return text.trim().length === 0;
		}
		return false;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Built-in rules
// ---------------------------------------------------------------------------

export const BUILTIN_RULES: HideRule[] = [
	{
		id: 'emptyInitPy',
		label: 'Empty __init__.py',
		description: 'Hide __init__.py files that are empty or whitespace-only',
		glob: '**/__init__.py',
		filter: isFileEmpty,
	},
	{
		id: 'dsStore',
		label: '.DS_Store',
		description: 'Hide macOS .DS_Store metadata files',
		glob: '**/.DS_Store',
	},
	{
		id: 'pycache',
		label: '__pycache__',
		description: 'Hide Python bytecode cache folders',
		glob: '**/__pycache__',
	},
	{
		id: 'thumbsDb',
		label: 'Thumbs.db',
		description: 'Hide Windows thumbnail cache files',
		glob: '**/Thumbs.db',
	},
	{
		id: 'desktopIni',
		label: 'desktop.ini',
		description: 'Hide Windows desktop.ini files',
		glob: '**/desktop.ini',
	},
	{
		id: 'pytest_cache',
		label: '.pytest_cache',
		description: 'Hide pytest cache folders',
		glob: '**/.pytest_cache',
	},
	{
		id: 'mypy_cache',
		label: '.mypy_cache',
		description: 'Hide mypy cache folders',
		glob: '**/.mypy_cache',
	},
	{
		id: 'egg_info',
		label: '*.egg-info',
		description: 'Hide Python egg-info directories',
		glob: '**/*.egg-info',
	},
];
