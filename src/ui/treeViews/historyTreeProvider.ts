import * as vscode from 'vscode';

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined> = new vscode.EventEmitter<HistoryItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined> = this._onDidChangeTreeData.event;

    private historyItems: HistoryItem[] = [];

    constructor() {
        // Load history items from storage or initialize if empty
        this.loadHistory();
    }

    getTreeItem(element: HistoryItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
        if (element) {
            return Promise.resolve([]); // No children for history items
        }
        return Promise.resolve(this.historyItems);
    }

    addHistoryItem(commandText: string): void {
        const newItem = new HistoryItem(commandText);
        this.historyItems.push(newItem);
        this._onDidChangeTreeData.fire(undefined);
        this.saveHistory();
    }

    private loadHistory(): void {
        // Logic to load history from persistent storage
    }

    private saveHistory(): void {
        // Logic to save history to persistent storage
    }
}

class HistoryItem extends vscode.TreeItem {
    public readonly commandText: string;

    constructor(commandText: string) {
        super(commandText, vscode.TreeItemCollapsibleState.None);
        this.commandText = commandText;
        this.tooltip = commandText;
        this.description = commandText;
    }
}