import * as vscode from 'vscode';
import { BUILTIN_RULES } from './rules';
import { getRelativePath, getManagedPaths, saveManagedPaths, getActiveRuleIds, getCustomPatterns } from './config';

// ---------------------------------------------------------------------------
// Core: collect paths that should be hidden
// ---------------------------------------------------------------------------

async function collectPathsToHide(): Promise<Set<string>> {
	const paths = new Set<string>();
	const activeIds = new Set(getActiveRuleIds());

	// Kick off all findFiles calls in parallel
	const activeRules = BUILTIN_RULES.filter(r => activeIds.has(r.id));
	const customPatterns = getCustomPatterns().filter(Boolean);

	const [ruleResults, customResults] = await Promise.all([
		Promise.all(activeRules.map(async rule => {
			const uris = await vscode.workspace.findFiles(rule.glob, '**/node_modules/**');
			const filtered: vscode.Uri[] = [];
			for (const uri of uris) {
				if (!rule.filter || await rule.filter(uri)) {
					filtered.push(uri);
				}
			}
			return filtered;
		})),
		Promise.all(customPatterns.map(pat =>
			vscode.workspace.findFiles(pat, '**/node_modules/**')
		)),
	]);

	for (const uris of [...ruleResults, ...customResults]) {
		for (const uri of uris) {
			const rel = getRelativePath(uri);
			if (rel) {
				paths.add(rel);
			}
		}
	}

	return paths;
}

// ---------------------------------------------------------------------------
// Refresh: synchronise files.exclude with the desired hidden set
// ---------------------------------------------------------------------------

export async function refreshHiddenFiles(context: vscode.ExtensionContext): Promise<void> {
	const config = vscode.workspace.getConfiguration('fileHider');
	const enabled = config.get<boolean>('enabled', true);

	const previouslyManaged = getManagedPaths(context);
	let newManaged = new Set<string>();

	if (enabled) {
		newManaged = await collectPathsToHide();
	}

	const toAdd = [...newManaged].filter(p => !previouslyManaged.has(p));
	const toRemove = [...previouslyManaged].filter(p => !newManaged.has(p));

	if (toAdd.length === 0 && toRemove.length === 0) {
		return;
	}

	const filesConfig = vscode.workspace.getConfiguration('files');
	const exclude: Record<string, boolean> = { ...filesConfig.get<Record<string, boolean>>('exclude') };

	for (const p of toRemove) {
		delete exclude[p];
	}
	for (const p of toAdd) {
		exclude[p] = true;
	}

	await filesConfig.update('exclude', exclude, vscode.ConfigurationTarget.Workspace);
	await saveManagedPaths(context, newManaged);
}

// ---------------------------------------------------------------------------
// Debounced refresh
// ---------------------------------------------------------------------------

let refreshTimer: ReturnType<typeof setTimeout> | undefined;

export function scheduleRefresh(context: vscode.ExtensionContext, delayMs = 300): void {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
	}
	refreshTimer = setTimeout(() => {
		refreshTimer = undefined;
		refreshHiddenFiles(context);
	}, delayMs);
}
