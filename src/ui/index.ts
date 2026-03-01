import { registerCommandPalette } from './commandPalette';
import { OutputChannel } from './outputChannel';
import { StatusBarManager } from './statusBar';
import { PipelinesTreeProvider } from './treeViews/pipelinesTreeProvider';
import { ResourcesTreeProvider } from './treeViews/resourcesTreeProvider';
import { HistoryTreeProvider } from './treeViews/historyTreeProvider';
import { DashboardPanel } from './webviews/dashboardPanel';
import { SettingsPanel } from './webviews/settingsPanel';

// Export function as CommandPalette for compatibility
export const CommandPalette = { register: registerCommandPalette };

// Export StatusBarManager as StatusBar alias
export { StatusBarManager as StatusBar };

export {
    registerCommandPalette,
    OutputChannel,
    StatusBarManager,
    PipelinesTreeProvider,
    ResourcesTreeProvider,
    HistoryTreeProvider,
    DashboardPanel,
    SettingsPanel,
};