import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.tooltip = 'DevOps Omnibus';
        this.statusBarItem.command = 'devops-omnibus.showStatus';
        this.statusBarItem.show();
    }

    public updateStatus(message: string) {
        this.statusBarItem.text = message;
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}