import { registerCommand } from './commandRegistry';
import { cicdHandler } from './handlers/cicdHandler';
import { cloudHandler } from './handlers/cloudHandler';
import { containerHandler } from './handlers/containerHandler';
import { gitHandler } from './handlers/gitHandler';
import { infrastructureHandler } from './handlers/infrastructureHandler';

export function registerCommands() {
    registerCommand('devops.cicd', cicdHandler);
    registerCommand('devops.cloud', cloudHandler);
    registerCommand('devops.container', containerHandler);
    registerCommand('devops.git', gitHandler);
    registerCommand('devops.infrastructure', infrastructureHandler);
}