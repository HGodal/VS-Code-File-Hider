import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Workspace-relative path
// ---------------------------------------------------------------------------

export function getRelativePath(uri: vscode.Uri): string | undefined {
	const folder = vscode.workspace.getWorkspaceFolder(uri);
	if (!folder) {
		return undefined;
	}
	return vscode.workspace.asRelativePath(uri, false);
}

// ---------------------------------------------------------------------------
// Managed-paths state (workspace state)
// ---------------------------------------------------------------------------

export function getManagedPaths(context: vscode.ExtensionContext): Set<string> {
	return new Set(context.workspaceState.get<string[]>('managedPaths', []));
}

export async function saveManagedPaths(context: vscode.ExtensionContext, paths: Set<string>): Promise<void> {
	await context.workspaceState.update('managedPaths', [...paths]);
}

// ---------------------------------------------------------------------------
// Configuration readers
// ---------------------------------------------------------------------------

export function getActiveRuleIds(): string[] {
	const config = vscode.workspace.getConfiguration('fileHider');
	return config.get<string[]>('activeRules', []);
}

export function getCustomPatterns(): string[] {
	const config = vscode.workspace.getConfiguration('fileHider');
	return config.get<string[]>('customPatterns', []);
}
