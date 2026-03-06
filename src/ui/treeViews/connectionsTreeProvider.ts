import * as vscode from 'vscode';
import { CredentialManager } from '../../auth/CredentialManager';
import { ServiceType } from '../../shared/types';

/**
 * Connection tree item representing a connected service
 */
export class ConnectionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly serviceId: string,
        public readonly serviceName: string,
        public readonly status: 'connected' | 'disconnected' | 'error',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(serviceName, collapsibleState);
        
        this.tooltip = `${serviceName} - ${status}`;
        this.description = status;
        
        // Set icon based on service and status
        this.iconPath = this.getIcon();
        
        // Set context value for menu visibility
        this.contextValue = status === 'connected' ? 'connectedService' : 'disconnectedService';
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.status !== 'connected') {
            return new vscode.ThemeIcon('debug-disconnect', new vscode.ThemeColor('charts.red'));
        }

        const icons: Record<string, string> = {
            github: 'github',
            docker: 'package',
            aws: 'cloud',
            azure: 'azure',
            gcp: 'cloud',
            kubernetes: 'server',
            slack: 'comment-discussion',
            jira: 'checklist'
        };

        return new vscode.ThemeIcon(
            icons[this.serviceId] || 'plug',
            new vscode.ThemeColor('charts.green')
        );
    }
}

/**
 * ConnectionsTreeProvider - Provides data for the Connections tree view
 * Shows all connected services and their status
 */
export class ConnectionsTreeProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ConnectionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private credentialManager: CredentialManager) {}

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item for display
     */
    getTreeItem(element: ConnectionTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children for tree item
     */
    async getChildren(element?: ConnectionTreeItem): Promise<ConnectionTreeItem[]> {
        if (element) {
            return [];
        }

        // Get all connected services
        const services = await this.credentialManager.listConnectedServices();
        return services.map(service => 
            new ConnectionTreeItem(
                service.type,
                service.displayName,
                service.status as 'connected' | 'disconnected' | 'error',
                vscode.TreeItemCollapsibleState.None
            )
        );
    }
}

