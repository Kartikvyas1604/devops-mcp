import * as vscode from 'vscode';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private static disposables: vscode.Disposable[] = [];

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        this.panel.onDidDispose(() => this.dispose(), null, DashboardPanel.disposables);
        this.update();
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.One;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal(column);
            DashboardPanel.currentPanel.update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'dashboard',
            'DevOps Dashboard',
            column,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }

    private update() {
        this.panel.title = 'DevOps Dashboard';
        this.panel.webview.html = this.getWebviewContent();
    }

    private getWebviewContent() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DevOps Dashboard</title>
        </head>
        <body>
            <h1>Welcome to the DevOps Dashboard</h1>
            <div id="content">
                <p>Your DevOps tasks will be displayed here.</p>
            </div>
        </body>
        </html>`;
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}