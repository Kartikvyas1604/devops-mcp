/**
 * Kubernetes Client - Wrapper for Kubernetes API operations
 * Note: Requires @kubernetes/client-node package for full functionality
 */

export interface K8sPodSpec {
    containers?: { name?: string; image?: string }[];
}

export interface K8sPod {
    metadata?: { name?: string; namespace?: string };
    spec?: K8sPodSpec;
    status?: { phase?: string };
}

export interface K8sPodList {
    items?: K8sPod[];
}

export class K8sClient {
    private k8sApi: unknown;
    private initialized = false;

    constructor() {
        this.initializeClient();
    }

    private async initializeClient(): Promise<void> {
        try {
            const k8sModule = await import('@kubernetes/client-node').catch(() => null);
            if (k8sModule) {
                const kubeconfig = new k8sModule.KubeConfig();
                kubeconfig.loadFromDefault();
                this.k8sApi = kubeconfig.makeApiClient(k8sModule.CoreV1Api);
                this.initialized = true;
            }
        } catch {
            console.warn('Kubernetes client-node not available. K8s operations will be stubbed.');
        }
    }

    public async listPods(namespace: string): Promise<K8sPodList> {
        if (!this.initialized || !this.k8sApi) {
            console.warn('K8s client not initialized');
            return { items: [] };
        }
        try {
            const api = this.k8sApi as { listNamespacedPod: (ns: string) => Promise<{ body: K8sPodList }> };
            const res = await api.listNamespacedPod(namespace);
            return res.body;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list pods: ${message}`);
        }
    }

    public async getPod(namespace: string, name: string): Promise<K8sPod | null> {
        if (!this.initialized || !this.k8sApi) {
            return null;
        }
        try {
            const api = this.k8sApi as { readNamespacedPod: (name: string, ns: string) => Promise<{ body: K8sPod }> };
            const res = await api.readNamespacedPod(name, namespace);
            return res.body;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get pod ${name}: ${message}`);
        }
    }

    public async createPod(namespace: string, podManifest: K8sPod): Promise<K8sPod | null> {
        if (!this.initialized || !this.k8sApi) {
            throw new Error('K8s client not initialized');
        }
        try {
            const api = this.k8sApi as { createNamespacedPod: (ns: string, manifest: K8sPod) => Promise<{ body: K8sPod }> };
            const res = await api.createNamespacedPod(namespace, podManifest);
            return res.body;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create pod: ${message}`);
        }
    }

    public async deletePod(namespace: string, name: string): Promise<K8sPod | null> {
        if (!this.initialized || !this.k8sApi) {
            throw new Error('K8s client not initialized');
        }
        try {
            const api = this.k8sApi as { deleteNamespacedPod: (name: string, ns: string) => Promise<{ body: K8sPod }> };
            const res = await api.deleteNamespacedPod(name, namespace);
            return res.body;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete pod ${name}: ${message}`);
        }
    }
}