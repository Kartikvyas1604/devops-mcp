import { window } from 'vscode';

export function handleError(error: Error): void {
    // Log the error to the console
    console.error(error);

    // Show a user-friendly message in the output channel
    window.showErrorMessage(`An error occurred: ${error.message}`);
}