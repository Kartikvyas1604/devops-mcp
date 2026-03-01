export type Command = {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    handler: (...args: any[]) => Promise<any>;
};

export type CommandRegistry = {
    [key: string]: Command;
};