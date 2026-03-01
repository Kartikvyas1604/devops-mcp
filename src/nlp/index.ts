import { IntentParser } from './intentParser';
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

    public processCommand(command: string) {
        const intent = this.intentParser.parse(command);
        const entities = this.entityExtractor.extract(command);
        return this.commandMapper.map(intent, entities);
    }
}