export class EntityExtractor {
    private entityPatterns: { [key: string]: RegExp };

    constructor() {
        this.entityPatterns = {
            projectName: /(?:project|app|service)\s+([a-zA-Z0-9-_]+)/i,
            serviceType: /(?:service|type)\s+([a-zA-Z]+)/i,
            environment: /(?:env|environment)\s+([a-zA-Z]+)/i,
        };
    }

    public extractEntities(command: string): { [key: string]: string | null } {
        const entities: { [key: string]: string | null } = {};

        for (const [key, pattern] of Object.entries(this.entityPatterns)) {
            const match = command.match(pattern);
            entities[key] = match ? match[1] : null;
        }

        return entities;
    }
}