import { DockerClient } from '../../providers/docker/dockerClient';
import { K8sClient } from '../../providers/kubernetes/k8sClient';

export class ContainerHandler {
    private dockerClient: DockerClient;
    private k8sClient: K8sClient;

    constructor() {
        this.dockerClient = new DockerClient();
        this.k8sClient = new K8sClient();
    }

    public async buildDockerImage(imageName: string, dockerfilePath: string): Promise<void> {
        await this.dockerClient.buildImage(imageName, dockerfilePath);
    }

    public async runDockerContainer(imageName: string, containerName: string): Promise<void> {
        await this.dockerClient.runContainer(imageName, containerName);
    }

    public async deployToKubernetes(deploymentConfig: any): Promise<void> {
        await this.k8sClient.deploy(deploymentConfig);
    }

    public async getK8sPods(namespace: string): Promise<any> {
        return await this.k8sClient.getPods(namespace);
    }
}