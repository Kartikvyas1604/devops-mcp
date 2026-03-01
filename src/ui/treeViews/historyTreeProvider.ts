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

    addHistoryItem(command: string) {
        const newItem = new HistoryItem(command);
        this.historyItems.push(newItem);
        this._onDidChangeTreeData.fire();
        this.saveHistory();
    }

    private loadHistory() {
        // Logic to load history from persistent storage
    }

    private saveHistory() {
        // Logic to save history to persistent storage
    }
}

class HistoryItem extends vscode.TreeItem {
    constructor(public command: string) {
        super(command, vscode.TreeItemCollapsibleState.None);
        this.tooltip = command;
        this.description = command;
    }
}