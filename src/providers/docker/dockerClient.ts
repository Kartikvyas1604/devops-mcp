import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export class DockerClient {
    private dockerHost: string;

    constructor(dockerHost: string) {
        this.dockerHost = dockerHost;
    }

    public async listContainers(): Promise<any> {
        const command = `docker -H ${this.dockerHost} ps -a --format '{{json .}}'`;
        const { stdout } = await execPromise(command);
        return stdout.split('\n').filter(line => line).map(line => JSON.parse(line));
    }

    public async startContainer(containerId: string): Promise<void> {
        const command = `docker -H ${this.dockerHost} start ${containerId}`;
        await execPromise(command);
    }

    public async stopContainer(containerId: string): Promise<void> {
        const command = `docker -H ${this.dockerHost} stop ${containerId}`;
        await execPromise(command);
    }

    public async removeContainer(containerId: string): Promise<void> {
        const command = `docker -H ${this.dockerHost} rm ${containerId}`;
        await execPromise(command);
    }

    public async runContainer(image: string, options: string = ''): Promise<string> {
        const command = `docker -H ${this.dockerHost} run ${options} ${image}`;
        const { stdout } = await execPromise(command);
        return stdout.trim();
    }
}