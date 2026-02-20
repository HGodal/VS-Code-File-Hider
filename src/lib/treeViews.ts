import * as vscode from 'vscode';
import { HideRule, BUILTIN_RULES } from './rules';
import { getActiveRuleIds, getCustomPatterns } from './config';

// ---------------------------------------------------------------------------
// Tree view – Built-in Rules
// ---------------------------------------------------------------------------

export class RuleTreeItem extends vscode.TreeItem {
	constructor(
		public readonly rule: HideRule,
		public readonly isActive: boolean,
	) {
		super(rule.label, vscode.TreeItemCollapsibleState.None);
		this.description = isActive ? 'Hidden' : 'Visible';
		this.tooltip = `${rule.description}\n\nClick the toggle icon to ${isActive ? 'show' : 'hide'} these files.`;
		this.iconPath = new vscode.ThemeIcon(isActive ? 'eye-closed' : 'eye');
		this.contextValue = 'rule';

		// Clicking the item itself also toggles the rule
		this.command = {
			command: 'file-hider.toggleRule',
			title: 'Toggle Rule',
			arguments: [this],
		};
	}
}

export class RulesTreeDataProvider implements vscode.TreeDataProvider<RuleTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<RuleTreeItem | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	dispose(): void {
		this._onDidChangeTreeData.dispose();
	}

	getTreeItem(element: RuleTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): RuleTreeItem[] {
		const activeIds = new Set(getActiveRuleIds());
		return BUILTIN_RULES.map(rule => new RuleTreeItem(rule, activeIds.has(rule.id)));
	}
}

// ---------------------------------------------------------------------------
// Tree view – Custom Patterns
// ---------------------------------------------------------------------------

export class CustomPatternTreeItem extends vscode.TreeItem {
	constructor(public readonly pattern: string) {
		super(pattern, vscode.TreeItemCollapsibleState.None);
		this.iconPath = new vscode.ThemeIcon('file-code');
		this.tooltip = `Glob pattern: ${pattern}`;
		this.contextValue = 'customPattern';
	}
}

export class CustomPatternsTreeDataProvider implements vscode.TreeDataProvider<CustomPatternTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<CustomPatternTreeItem | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	dispose(): void {
		this._onDidChangeTreeData.dispose();
	}

	getTreeItem(element: CustomPatternTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): CustomPatternTreeItem[] {
		const patterns = getCustomPatterns().filter(Boolean);
		if (patterns.length === 0) {
			return [];
		}
		return patterns.map(p => new CustomPatternTreeItem(p));
	}
}
