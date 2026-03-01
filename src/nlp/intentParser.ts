export class IntentParser {
    private intentRegex: RegExp;

    constructor() {
        this.intentRegex = /(?<intent>\w+)(?:\s+(?<entities>.+))?/;
    }

    public parse(command: string): { intent: string; entities: string[] } | null {
        const match = this.intentRegex.exec(command);
        if (match && match.groups) {
            const intent = match.groups.intent;
            const entities = match.groups.entities ? match.groups.entities.split(/\s*,\s*/) : [];
            return { intent, entities };
        }
        return null;
    }
}