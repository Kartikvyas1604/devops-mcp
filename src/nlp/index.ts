import { IntentParser, ParsedIntent } from './intentParser';
import { EntityExtractor } from './entityExtractor';
import { CommandMapper } from './commandMapper';

export class NLPModule {
    private intentParser: IntentParser;
    private entityExtractor: EntityExtractor;
    private commandMapper: CommandMapper;

    constructor() {
        this.intentParser = new IntentParser();
        this.entityExtractor = new EntityExtractor();
        this.commandMapper = new CommandMapper();
    }

    public processCommand(command: string): { intent: ParsedIntent; entities: Record<string, string | null>; mappedCommand: string | undefined } {
        const intent = this.intentParser.parse(command);
        const entities = this.entityExtractor.extractEntities(command);
        const mappedCommand = this.commandMapper.mapIntentToCommand(intent.action || '');
        return { intent, entities, mappedCommand };
    }
}

export { IntentParser, ParsedIntent } from './intentParser';
export { EntityExtractor } from './entityExtractor';
export { CommandMapper } from './commandMapper';