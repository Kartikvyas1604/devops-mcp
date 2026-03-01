export class CommandMapper {
    private commandMap: Map<string, string>;

    constructor() {
        this.commandMap = new Map<string, string>();
        this.initializeCommandMap();
    }

    private initializeCommandMap() {
        // Map intents to commands
        this.commandMap.set('deploy', 'deployCommand');
        this.commandMap.set('build', 'buildCommand');
        this.commandMap.set('test', 'testCommand');
        this.commandMap.set('rollback', 'rollbackCommand');
        this.commandMap.set('status', 'statusCommand');
        // Add more mappings as needed
    }

    public mapIntentToCommand(intent: string): string | undefined {
        return this.commandMap.get(intent);
    }
}