import * as vscode from 'vscode';

/**
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('DevOps Omnibus is now active!');

    // Register the main command
    const runCommand = vscode.commands.registerCommand(
        'devops-omnibus.runCommand',
        async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter your DevOps command',
                placeHolder: 'e.g., "Deploy this to AWS Lambda"'
            });

            if (input) {
                vscode.window.showInformationMessage(`Executing: ${input}`);
                // TODO: Process through NLP and execute
            }
        }
    );

    context.subscriptions.push(runCommand);
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): void {
    console.log('DevOps Omnibus deactivated');
}