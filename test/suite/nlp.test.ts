import { describe, it, expect } from 'vitest';
import { IntentParser } from '../../src/nlp/intentParser';
import { EntityExtractor } from '../../src/nlp/entityExtractor';
import { CommandMapper } from '../../src/nlp/commandMapper';

describe('NLP Module Tests', () => {
    let intentParser: IntentParser;
    let entityExtractor: EntityExtractor;
    let commandMapper: CommandMapper;

    beforeEach(() => {
        intentParser = new IntentParser();
        entityExtractor = new EntityExtractor();
        commandMapper = new CommandMapper();
    });

    it('should parse intents correctly', () => {
        const command = 'Deploy the application to AWS';
        const intent = intentParser.parse(command);
        expect(intent).toEqual({ action: 'deploy', target: 'application', provider: 'AWS' });
    });

    it('should extract entities correctly', () => {
        const command = 'Show me the logs for the last deployment';
        const entities = entityExtractor.extract(command);
        expect(entities).toEqual({ resource: 'logs', action: 'show', context: 'last deployment' });
    });

    it('should map intents and entities to commands', () => {
        const intent = { action: 'deploy', target: 'application', provider: 'AWS' };
        const command = commandMapper.map(intent);
        expect(command).toBe('deployApplicationToAWS');
    });
});