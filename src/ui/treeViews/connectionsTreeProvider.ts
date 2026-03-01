import * as vscode from 'vscode';
import { SecretsService, ServiceConnection } from '../../services/secretsService';

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

    private secretsService: SecretsService;

    constructor(secretsService: SecretsService) {
        this.secretsService = secretsService;
    }

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
            // No nested children for now
            return [];
        }

        // Get all available services
        const allServices = [
            { id: 'github', name: 'GitHub' },
            { id: 'docker', name: 'Docker' },
            { id: 'aws', name: 'AWS' },
            { id: 'azure', name: 'Azure' },
            { id: 'gcp', name: 'Google Cloud' },
            { id: 'kubernetes', name: 'Kubernetes' },
            { id: 'slack', name: 'Slack' },
            { id: 'jira', name: 'Jira' }
        ];

        // Check connection status for each service
        const items: ConnectionTreeItem[] = [];

        for (const service of allServices) {
            const isConnected = await this.secretsService.isConnected(service.id);
            items.push(new ConnectionTreeItem(
                service.id,
                service.name,
                isConnected ? 'connected' : 'disconnected',
                vscode.TreeItemCollapsibleState.None
            ));
        }

        // Sort by status (connected first)
        items.sort((a, b) => {
            if (a.status === 'connected' && b.status !== 'connected') return -1;
            if (a.status !== 'connected' && b.status === 'connected') return 1;
            return a.serviceName.localeCompare(b.serviceName);
        });

        return items;
    }
}
