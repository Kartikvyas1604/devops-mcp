import * as vscode from 'vscode';

export class SettingsPanel {
    private panel: vscode.WebviewPanel | undefined;

    public static createOrShow(context: vscode.ExtensionContext) {
        const panel = vscode.window.createWebviewPanel(
            'settingsPanel',
            'Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
            }
        );

        const instance = new SettingsPanel(panel, context);
        instance.setWebviewContent();
    }

    private constructor(panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
        this.panel = panel;

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private setWebviewContent() {
        if (!this.panel) {
            return;
        }

        this.panel.webview.html = this.getWebviewContent();
    }

    private getWebviewContent() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Settings</title>
        </head>
        <body>
            <h1>Settings Panel</h1>
            <div>
                <label for="setting1">Setting 1:</label>
                <input type="text" id="setting1" />
            </div>
            <div>
                <label for="setting2">Setting 2:</label>
                <input type="text" id="setting2" />
            </div>
            <button id="saveButton">Save</button>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('saveButton').addEventListener('click', () => {
                    const setting1 = document.getElementById('setting1').value;
                    const setting2 = document.getElementById('setting2').value;
                    vscode.postMessage({ command: 'saveSettings', setting1, setting2 });
                });
            </script>
        </body>
        </html>`;
    }
}