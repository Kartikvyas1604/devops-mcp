import * as vscode from 'vscode';

/**
 * StatusBarManager - Manages the status bar items for DevOps Omnibus
 * Shows connection status, processing indicator, and quick actions
 */
export class StatusBarManager {
    private mainItem: vscode.StatusBarItem;
    private processingItem: vscode.StatusBarItem;
    private isConnected: boolean = false;
    private isProcessing: boolean = false;

    constructor() {
        // Main status item (shows connection status)
        this.mainItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.mainItem.command = 'devops-omnibus.runCommand';
        
        // Processing indicator
        this.processingItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            99
        );
    }

    /**
     * Initialize the status bar
     */
    initialize(context: vscode.ExtensionContext): void {
        context.subscriptions.push(this.mainItem, this.processingItem);
        this.updateMainStatus();
        this.mainItem.show();
    }

    /**
     * Set connection status
     */
    setConnected(connected: boolean): void {
        this.isConnected = connected;
        this.updateMainStatus();
    }

    /**
     * Set processing status
     */
    setProcessing(processing: boolean): void {
        this.isProcessing = processing;
        
        if (processing) {
            this.processingItem.text = '$(loading~spin) Processing...';
            this.processingItem.tooltip = 'DevOps Omnibus is processing your command';
            this.processingItem.show();
        } else {
            this.processingItem.hide();
        }
    }

    /**
     * Update the main status bar text
     */
    private updateMainStatus(): void {
        if (this.isConnected) {
            this.mainItem.text = '$(rocket) DevOps';
            this.mainItem.tooltip = 'DevOps Omnibus - Click to run a command';
            this.mainItem.backgroundColor = undefined;
        } else {
            this.mainItem.text = '$(rocket) DevOps (Offline)';
            this.mainItem.tooltip = 'DevOps Omnibus - Not connected';
            this.mainItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    }

    /**
     * Show a temporary message
     */
    showMessage(message: string, duration: number = 3000): void {
        const originalText = this.mainItem.text;
        const originalTooltip = this.mainItem.tooltip;
        
        this.mainItem.text = message;
        this.mainItem.tooltip = message;
        
        setTimeout(() => {
            this.mainItem.text = originalText;
            this.mainItem.tooltip = originalTooltip;
        }, duration);
    }

    /**
     * Update status with connection count
     */
    updateConnectionCount(count: number): void {
        if (count > 0) {
            this.mainItem.text = `$(rocket) DevOps (${count})`;
            this.mainItem.tooltip = `DevOps Omnibus - ${count} service${count > 1 ? 's' : ''} connected`;
        } else {
            this.updateMainStatus();
        }
    }

    /**
     * Dispose all status bar items
     */
    dispose(): void {
        this.mainItem.dispose();
        this.processingItem.dispose();
    }
}