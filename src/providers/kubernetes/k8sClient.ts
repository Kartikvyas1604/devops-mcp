import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';

export class K8sClient {
    private k8sApi: CoreV1Api;

    constructor() {
        const kubeconfig = new KubeConfig();
        kubeconfig.loadFromDefault();
        this.k8sApi = kubeconfig.makeApiClient(CoreV1Api);
    }

    public async listPods(namespace: string): Promise<any> {
        try {
            const res = await this.k8sApi.listNamespacedPod(namespace);
            return res.body;
        } catch (error) {
            throw new Error(`Failed to list pods: ${error.message}`);
        }
    }

    public async getPod(namespace: string, name: string): Promise<any> {
        try {
            const res = await this.k8sApi.readNamespacedPod(name, namespace);
            return res.body;
        } catch (error) {
            throw new Error(`Failed to get pod ${name}: ${error.message}`);
        }
    }

    public async createPod(namespace: string, podManifest: any): Promise<any> {
        try {
            const res = await this.k8sApi.createNamespacedPod(namespace, podManifest);
            return res.body;
        } catch (error) {
            throw new Error(`Failed to create pod: ${error.message}`);
        }
    }

    public async deletePod(namespace: string, name: string): Promise<any> {
        try {
            const res = await this.k8sApi.deleteNamespacedPod(name, namespace);
            return res.body;
        } catch (error) {
            throw new Error(`Failed to delete pod ${name}: ${error.message}`);
        }
    }
}