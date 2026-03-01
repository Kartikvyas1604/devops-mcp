import { commands } from 'vscode';
import { cicdHandler } from './handlers/cicdHandler';
import { cloudHandler } from './handlers/cloudHandler';
import { containerHandler } from './handlers/containerHandler';
import { gitHandler } from './handlers/gitHandler';
import { infrastructureHandler } from './handlers/infrastructureHandler';

export class CommandRegistry {
    private commandMap: Map<string, Function>;

    constructor() {
        this.commandMap = new Map();
        this.registerCommands();
    }

    private registerCommands() {
        this.commandMap.set('devops.cicd', cicdHandler);
        this.commandMap.set('devops.cloud', cloudHandler);
        this.commandMap.set('devops.container', containerHandler);
        this.commandMap.set('devops.git', gitHandler);
        this.commandMap.set('devops.infrastructure', infrastructureHandler);

        this.commandMap.forEach((handler, command) => {
            commands.registerCommand(command, handler);
        });
    }
}