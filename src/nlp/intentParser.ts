/**
 * Parsed intent from natural language command
 */
export interface ParsedIntent {
    category: 'docker' | 'cicd' | 'cloud' | 'kubernetes' | 'git' | 'jira' | 'slack' | 'vibe' | 'unknown';
    action: string | null;
    parameters: Record<string, string>;
    confidence: number;
    originalCommand: string;
}

/**
 * Intent pattern definition
 */
interface IntentPattern {
    category: ParsedIntent['category'];
    patterns: RegExp[];
    extractAction: (match: RegExpMatchArray) => string | null;
    extractParams: (command: string, match: RegExpMatchArray) => Record<string, string>;
}

/**
 * IntentParser - Parses natural language commands into structured intents
 * Uses pattern matching and keyword extraction
 */
export class IntentParser {
    private patterns: IntentPattern[];

    constructor() {
        this.patterns = this.initializePatterns();
    }

    /**
     * Parse a natural language command
     * @param command - The command to parse
     * @returns Parsed intent
     */
    public parse(command: string): ParsedIntent {
        const normalizedCommand = command.toLowerCase().trim();
        
        for (const pattern of this.patterns) {
            for (const regex of pattern.patterns) {
                const match = normalizedCommand.match(regex);
                if (match) {
                    return {
                        category: pattern.category,
                        action: pattern.extractAction(match),
                        parameters: pattern.extractParams(command, match),
                        confidence: 0.8,
                        originalCommand: command
                    };
                }
            }
        }

        // No pattern matched
        return {
            category: 'unknown',
            action: null,
            parameters: {},
            confidence: 0.2,
            originalCommand: command
        };
    }

    /**
     * Initialize intent patterns
     */
    private initializePatterns(): IntentPattern[] {
        return [
            // Docker patterns
            {
                category: 'docker',
                patterns: [
                    /(?:generate|create|make|add)\s+(?:a\s+)?dockerfile/i,
                    /dockerfile/i,
                    /docker\s+(?:build|push|run|compose)/i,
                    /(?:build|create)\s+(?:a\s+)?(?:docker\s+)?image/i,
                    /containerize/i
                ],
                extractAction: (match) => {
                    const cmd = match[0].toLowerCase();
                    if (cmd.includes('build') || cmd.includes('image')) return 'build';
                    if (cmd.includes('push')) return 'push';
                    if (cmd.includes('run')) return 'run';
                    if (cmd.includes('compose')) return 'compose';
                    return 'generate';
                },
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    const imageMatch = command.match(/(?:image|named?)\s+(\S+)/i);
                    if (imageMatch) params.imageName = imageMatch[1];
                    const tagMatch = command.match(/tag(?:ged)?\s+(\S+)/i);
                    if (tagMatch) params.tag = tagMatch[1];
                    return params;
                }
            },

            // CI/CD patterns
            {
                category: 'cicd',
                patterns: [
                    /(?:create|generate|set\s*up|add)\s+(?:a\s+)?(?:ci\/?cd|pipeline|workflow)/i,
                    /github\s+actions?/i,
                    /gitlab\s+ci/i,
                    /jenkins(?:file)?/i,
                    /azure\s+(?:devops|pipelines?)/i,
                    /circleci/i
                ],
                extractAction: () => 'generate',
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    if (command.toLowerCase().includes('github')) params.provider = 'github-actions';
                    else if (command.toLowerCase().includes('gitlab')) params.provider = 'gitlab-ci';
                    else if (command.toLowerCase().includes('jenkins')) params.provider = 'jenkins';
                    else if (command.toLowerCase().includes('azure')) params.provider = 'azure-devops';
                    else if (command.toLowerCase().includes('circleci')) params.provider = 'circleci';
                    else params.provider = 'github-actions';
                    return params;
                }
            },

            // Cloud deployment patterns
            {
                category: 'cloud',
                patterns: [
                    /deploy\s+(?:to\s+)?(?:aws|amazon|ec2|lambda|ecs|s3)/i,
                    /deploy\s+(?:to\s+)?(?:gcp|google\s+cloud|cloud\s+run|gke)/i,
                    /deploy\s+(?:to\s+)?(?:azure|app\s+service)/i,
                    /(?:set\s*up|create|provision)\s+(?:aws|gcp|azure)/i,
                    /(?:aws|gcp|azure)\s+(?:bucket|instance|function|service)/i
                ],
                extractAction: () => 'deploy',
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    const lowerCmd = command.toLowerCase();
                    
                    // Detect provider
                    if (lowerCmd.includes('aws') || lowerCmd.includes('amazon') || 
                        lowerCmd.includes('ec2') || lowerCmd.includes('lambda') || 
                        lowerCmd.includes('ecs') || lowerCmd.includes('s3')) {
                        params.provider = 'aws';
                    } else if (lowerCmd.includes('gcp') || lowerCmd.includes('google') || 
                               lowerCmd.includes('cloud run') || lowerCmd.includes('gke')) {
                        params.provider = 'gcp';
                    } else if (lowerCmd.includes('azure')) {
                        params.provider = 'azure';
                    }

                    // Detect service
                    if (lowerCmd.includes('lambda') || lowerCmd.includes('function')) {
                        params.service = 'lambda';
                    } else if (lowerCmd.includes('ec2') || lowerCmd.includes('instance')) {
                        params.service = 'ec2';
                    } else if (lowerCmd.includes('ecs') || lowerCmd.includes('container')) {
                        params.service = 'ecs';
                    } else if (lowerCmd.includes('s3') || lowerCmd.includes('bucket')) {
                        params.service = 's3';
                    } else if (lowerCmd.includes('cloud run')) {
                        params.service = 'cloud-run';
                    }

                    return params;
                }
            },

            // Kubernetes patterns
            {
                category: 'kubernetes',
                patterns: [
                    /(?:deploy|scale|delete)\s+(?:to\s+)?(?:k8s|kubernetes|cluster)/i,
                    /kubectl/i,
                    /(?:create|generate)\s+(?:a\s+)?helm/i,
                    /pod(?:s)?\s+(?:logs?|status)/i,
                    /kubernetes\s+(?:deploy|cluster|namespace)/i
                ],
                extractAction: (match) => {
                    const cmd = match[0].toLowerCase();
                    if (cmd.includes('scale')) return 'scale';
                    if (cmd.includes('delete')) return 'delete';
                    if (cmd.includes('logs')) return 'logs';
                    if (cmd.includes('helm')) return 'helm';
                    return 'deploy';
                },
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    const namespaceMatch = command.match(/namespace\s+(\S+)/i);
                    if (namespaceMatch) params.namespace = namespaceMatch[1];
                    return params;
                }
            },

            // Git patterns
            {
                category: 'git',
                patterns: [
                    /(?:create|make|open)\s+(?:a\s+)?(?:pr|pull\s+request)/i,
                    /git\s+(?:commit|push|pull|branch)/i,
                    /(?:commit|push)\s+(?:changes?|code)/i
                ],
                extractAction: (match) => {
                    const cmd = match[0].toLowerCase();
                    if (cmd.includes('pr') || cmd.includes('pull request')) return 'pr';
                    if (cmd.includes('commit')) return 'commit';
                    if (cmd.includes('push')) return 'push';
                    if (cmd.includes('pull')) return 'pull';
                    if (cmd.includes('branch')) return 'branch';
                    return 'commit';
                },
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    const messageMatch = command.match(/(?:message|msg)\s*[:=]?\s*["']?([^"']+)["']?/i);
                    if (messageMatch) params.message = messageMatch[1].trim();
                    return params;
                }
            },

            // Jira patterns
            {
                category: 'jira',
                patterns: [
                    /(?:create|add|make)\s+(?:a\s+)?(?:jira\s+)?(?:ticket|issue|epic|story|task|bug)/i,
                    /jira/i,
                    /(?:link|connect)\s+(?:to\s+)?jira/i
                ],
                extractAction: () => 'create',
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    const lowerCmd = command.toLowerCase();
                    
                    if (lowerCmd.includes('epic')) params.type = 'epic';
                    else if (lowerCmd.includes('story')) params.type = 'story';
                    else if (lowerCmd.includes('bug')) params.type = 'bug';
                    else params.type = 'task';

                    // Try to extract summary
                    const summaryMatch = command.match(/(?:titled?|called|named|for)\s+["']?([^"']+)["']?/i);
                    if (summaryMatch) params.summary = summaryMatch[1].trim();

                    return params;
                }
            },

            // Slack patterns
            {
                category: 'slack',
                patterns: [
                    /(?:send|post)\s+(?:a\s+)?(?:slack\s+)?(?:message|notification)/i,
                    /slack\s+(?:message|notify|webhook)/i,
                    /(?:notify|alert)\s+(?:on\s+)?slack/i,
                    /(?:create|add|set\s*up)\s+(?:a\s+)?(?:slack\s+)?webhook/i
                ],
                extractAction: (match) => {
                    const cmd = match[0].toLowerCase();
                    if (cmd.includes('webhook')) return 'webhook';
                    return 'message';
                },
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    const channelMatch = command.match(/#(\S+)/);
                    if (channelMatch) params.channel = channelMatch[1];
                    return params;
                }
            },

            // Vibe coding patterns
            {
                category: 'vibe',
                patterns: [
                    /vibe\s+(?:code|coding|create|build|make)/i,
                    /(?:scaffold|generate|create)\s+(?:a\s+)?(?:full\s+)?(?:app|application|project)/i,
                    /(?:build|create)\s+(?:me\s+)?(?:a\s+)?(?:next\.?js|react|vue|angular)\s+app/i
                ],
                extractAction: () => 'create',
                extractParams: (command, match) => {
                    const params: Record<string, string> = {};
                    params.description = command;
                    return params;
                }
            }
        ];
    }
}