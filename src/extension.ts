import * as vscode from 'vscode';
import { BUILTIN_RULES } from './lib/rules';
import { getActiveRuleIds, getCustomPatterns, getManagedPaths, saveManagedPaths } from './lib/config';
import { refreshHiddenFiles, scheduleRefresh } from './lib/hider';
import {
	RuleTreeItem,
	RulesTreeDataProvider,
	CustomPatternTreeItem,
	CustomPatternsTreeDataProvider,
} from './lib/treeViews';

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(): void {
	const config = vscode.workspace.getConfiguration('fileHider');
	const enabled = config.get<boolean>('enabled', true);
	const activeCount = getActiveRuleIds().length + getCustomPatterns().filter(Boolean).length;

	if (enabled) {
		statusBarItem.text = `$(eye-closed) File Hider (${activeCount} rules)`;
		statusBarItem.tooltip = 'File Hider is ON – click to toggle off';
	} else {
		statusBarItem.text = '$(eye) File Hider OFF';
		statusBarItem.tooltip = 'File Hider is OFF – click to toggle on';
	}
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
	console.log('File Hider is now active');

	// --- Tree views ---
	const rulesProvider = new RulesTreeDataProvider();
	const customPatternsProvider = new CustomPatternsTreeDataProvider();

	context.subscriptions.push(rulesProvider);
	context.subscriptions.push(customPatternsProvider);
	vscode.window.registerTreeDataProvider('fileHiderRules', rulesProvider);
	vscode.window.registerTreeDataProvider('fileHiderCustom', customPatternsProvider);

	// --- Status bar ---
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'file-hider.toggle';
	context.subscriptions.push(statusBarItem);
	updateStatusBar();
	statusBarItem.show();

	// --- Commands ---

	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.enable', async () => {
			const config = vscode.workspace.getConfiguration('fileHider');
			await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
			await refreshHiddenFiles(context);
			vscode.window.showInformationMessage('File Hider: Enabled.');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.disable', async () => {
			const managed = getManagedPaths(context);
			if (managed.size > 0) {
				const filesConfig = vscode.workspace.getConfiguration('files');
				const exclude: Record<string, boolean> = { ...filesConfig.get<Record<string, boolean>>('exclude') };
				for (const p of managed) {
					delete exclude[p];
				}
				await filesConfig.update('exclude', exclude, vscode.ConfigurationTarget.Workspace);
				await saveManagedPaths(context, new Set());
			}
			const config = vscode.workspace.getConfiguration('fileHider');
			await config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage('File Hider: Disabled – all managed files are now visible.');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.toggle', async () => {
			const config = vscode.workspace.getConfiguration('fileHider');
			const currentlyEnabled = config.get<boolean>('enabled', true);
			if (currentlyEnabled) {
				await vscode.commands.executeCommand('file-hider.disable');
			} else {
				await vscode.commands.executeCommand('file-hider.enable');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.refresh', async () => {
			await refreshHiddenFiles(context);
			vscode.window.showInformationMessage('File Hider: Refreshed hidden files.');
		})
	);

	// --- Select Rules quick-pick ---
	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.selectRules', async () => {
			const currentActive = new Set(getActiveRuleIds());

			const items: vscode.QuickPickItem[] = BUILTIN_RULES.map(rule => ({
				label: rule.label,
				description: rule.id,
				detail: rule.description,
				picked: currentActive.has(rule.id),
			}));

			const selected = await vscode.window.showQuickPick(items, {
				canPickMany: true,
				title: 'File Hider: Select which file types to hide',
				placeHolder: 'Check the rules you want active',
			});

			if (selected === undefined) {
				return;
			}

			const newIds = selected
				.map(item => item.description!)
				.filter(Boolean);

			const config = vscode.workspace.getConfiguration('fileHider');
			await config.update('activeRules', newIds, vscode.ConfigurationTarget.Workspace);

			if (!config.get<boolean>('enabled', true)) {
				await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
			}

			await refreshHiddenFiles(context);
			updateStatusBar();
			vscode.window.showInformationMessage(
				`File Hider: ${newIds.length} rule(s) active.`
			);
		})
	);

	// --- Toggle a built-in rule from the tree view ---
	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.toggleRule', async (item?: RuleTreeItem) => {
			if (!item) {
				return;
			}
			const config = vscode.workspace.getConfiguration('fileHider');
			const current = new Set(getActiveRuleIds());

			if (current.has(item.rule.id)) {
				current.delete(item.rule.id);
			} else {
				current.add(item.rule.id);
			}

			await config.update('activeRules', [...current], vscode.ConfigurationTarget.Workspace);
			rulesProvider.refresh();
			updateStatusBar();
			await refreshHiddenFiles(context);
		})
	);

	// --- Add a custom glob pattern ---
	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.addCustomPattern', async () => {
			const pattern = await vscode.window.showInputBox({
				prompt: 'Enter a glob pattern to hide (e.g. **/.env.local, **/dist)',
				placeHolder: '**/.env.local',
				validateInput: value => {
					if (!value || !value.trim()) {
						return 'Pattern cannot be empty';
					}
					return undefined;
				},
			});

			if (!pattern) {
				return;
			}

			const config = vscode.workspace.getConfiguration('fileHider');
			const current = getCustomPatterns();
			if (current.includes(pattern.trim())) {
				vscode.window.showWarningMessage(`Pattern "${pattern.trim()}" already exists.`);
				return;
			}

			await config.update('customPatterns', [...current, pattern.trim()], vscode.ConfigurationTarget.Workspace);
			customPatternsProvider.refresh();
			updateStatusBar();
			await refreshHiddenFiles(context);
		})
	);

	// --- Remove a custom glob pattern ---
	context.subscriptions.push(
		vscode.commands.registerCommand('file-hider.removeCustomPattern', async (item?: CustomPatternTreeItem) => {
			if (!item) {
				return;
			}

			const config = vscode.workspace.getConfiguration('fileHider');
			const current = getCustomPatterns().filter(p => p !== item.pattern);
			await config.update('customPatterns', current, vscode.ConfigurationTarget.Workspace);
			customPatternsProvider.refresh();
			updateStatusBar();
			await refreshHiddenFiles(context);
		})
	);

	// --- File system watchers (derived from built-in rules) ---
	for (const rule of BUILTIN_RULES) {
		const watcher = vscode.workspace.createFileSystemWatcher(rule.glob);
		watcher.onDidCreate(() => scheduleRefresh(context));
		watcher.onDidChange(() => scheduleRefresh(context));
		watcher.onDidDelete(() => scheduleRefresh(context));
		context.subscriptions.push(watcher);
	}

	// Watch a broad pattern so custom-pattern files also get picked up
	const broadWatcher = vscode.workspace.createFileSystemWatcher('**/*');
	broadWatcher.onDidCreate(() => scheduleRefresh(context));
	broadWatcher.onDidDelete(() => scheduleRefresh(context));
	context.subscriptions.push(broadWatcher);

	// --- React to config changes ---
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (
				e.affectsConfiguration('fileHider.enabled') ||
				e.affectsConfiguration('fileHider.activeRules') ||
				e.affectsConfiguration('fileHider.customPatterns')
			) {
				updateStatusBar();
				rulesProvider.refresh();
				customPatternsProvider.refresh();
				refreshHiddenFiles(context);
			}
		})
	);

	// --- First-run prompt ---
	const hasPrompted = context.workspaceState.get<boolean>('hasPromptedRules', false);
	if (!hasPrompted) {
		context.workspaceState.update('hasPromptedRules', true);
		vscode.commands.executeCommand('file-hider.selectRules');
	}

	// --- Always run initial scan ---
	refreshHiddenFiles(context);
}

export function deactivate() {}
