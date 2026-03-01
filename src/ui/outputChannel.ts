import * as vscode from 'vscode';

export class OutputChannel {
    private channel: vscode.OutputChannel;

    constructor(channelName: string) {
        this.channel = vscode.window.createOutputChannel(channelName);
    }

    public appendLine(message: string): void {
        this.channel.appendLine(message);
    }

    public show(): void {
        this.channel.show();
    }

    public clear(): void {
        this.channel.clear();
    }
}