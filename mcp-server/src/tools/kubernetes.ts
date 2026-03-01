/**
 * Kubernetes tool implementations for MCP server
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export class KubernetesTools {
  async execute(tool: string, args: Record<string, unknown>): Promise<string> {
    switch (tool) {
      case 'k8s_get_pods':
        return this.getPods(args);
      case 'k8s_apply':
        return this.apply(args);
      case 'k8s_delete':
        return this.deleteResource(args);
      case 'k8s_logs':
        return this.getLogs(args);
      case 'k8s_scale':
        return this.scale(args);
      default:
        throw new Error(`Unknown Kubernetes tool: ${tool}`);
    }
  }

  private async kubectl(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(`kubectl ${command}`);
      if (stderr && !stdout) {
        throw new Error(stderr);
      }
      return stdout;
    } catch (error) {
      if (error instanceof Error && 'stderr' in error) {
        throw new Error((error as { stderr: string }).stderr || error.message);
      }
      throw error;
    }
  }

  private async getPods(args: Record<string, unknown>): Promise<string> {
    const namespace = args.namespace as string | undefined;
    const selector = args.selector as string | undefined;
    const allNamespaces = args.allNamespaces as boolean ?? false;

    let command = 'get pods -o json';

    if (allNamespaces) {
      command += ' --all-namespaces';
    } else if (namespace) {
      command += ` -n ${namespace}`;
    }

    if (selector) {
      command += ` -l ${selector}`;
    }

    try {
      const output = await this.kubectl(command);
      const pods = JSON.parse(output);

      const formatted = pods.items.map((pod: Record<string, unknown>) => {
        const metadata = pod.metadata as Record<string, unknown>;
        const status = pod.status as Record<string, unknown>;
        const containerStatuses = status.containerStatuses as Record<string, unknown>[] | undefined;

        return {
          name: metadata.name,
          namespace: metadata.namespace,
          status: status.phase,
          ready: containerStatuses?.filter((c: Record<string, unknown>) => c.ready).length || 0,
          total: containerStatuses?.length || 0,
          restarts: containerStatuses?.reduce((sum: number, c: Record<string, unknown>) => sum + ((c.restartCount as number) || 0), 0) || 0,
          age: this.calculateAge(metadata.creationTimestamp as string),
          node: (pod.spec as Record<string, unknown>)?.nodeName
        };
      });

      return JSON.stringify({
        count: formatted.length,
        pods: formatted
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to get pods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async apply(args: Record<string, unknown>): Promise<string> {
    const manifest = args.manifest as string;
    const namespace = args.namespace as string | undefined;

    if (!manifest) {
      throw new Error('Manifest is required');
    }

    try {
      let command: string;

      // Check if manifest is a file path or YAML content
      if (manifest.includes('\n') || manifest.includes(':')) {
        // It's YAML content - write to temp file
        const tempFile = path.join(os.tmpdir(), `k8s-manifest-${Date.now()}.yaml`);
        await fs.writeFile(tempFile, manifest, 'utf-8');
        command = `apply -f ${tempFile}`;
        
        if (namespace) {
          command += ` -n ${namespace}`;
        }

        const output = await this.kubectl(command);
        
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});

        return JSON.stringify({
          status: 'applied',
          output: output.trim(),
          message: 'Manifest applied successfully'
        }, null, 2);
      } else {
        // It's a file path
        command = `apply -f ${manifest}`;
        
        if (namespace) {
          command += ` -n ${namespace}`;
        }

        const output = await this.kubectl(command);

        return JSON.stringify({
          status: 'applied',
          file: manifest,
          output: output.trim(),
          message: 'Manifest applied successfully'
        }, null, 2);
      }
    } catch (error) {
      throw new Error(`Failed to apply manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deleteResource(args: Record<string, unknown>): Promise<string> {
    const kind = args.kind as string;
    const name = args.name as string;
    const namespace = args.namespace as string | undefined;

    if (!kind || !name) {
      throw new Error('Kind and name are required');
    }

    try {
      let command = `delete ${kind} ${name}`;
      
      if (namespace) {
        command += ` -n ${namespace}`;
      }

      const output = await this.kubectl(command);

      return JSON.stringify({
        status: 'deleted',
        kind,
        name,
        namespace: namespace || 'default',
        output: output.trim(),
        message: `${kind} ${name} deleted successfully`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to delete ${kind} ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getLogs(args: Record<string, unknown>): Promise<string> {
    const pod = args.pod as string;
    const namespace = args.namespace as string | undefined;
    const container = args.container as string | undefined;
    const tail = args.tail as number ?? 100;
    const follow = args.follow as boolean ?? false;

    if (!pod) {
      throw new Error('Pod name is required');
    }

    try {
      let command = `logs ${pod}`;
      
      if (namespace) {
        command += ` -n ${namespace}`;
      }
      
      if (container) {
        command += ` -c ${container}`;
      }
      
      command += ` --tail=${tail}`;

      // Note: follow mode not supported in this context
      if (follow) {
        console.warn('Follow mode not supported, returning last logs');
      }

      const output = await this.kubectl(command);

      return JSON.stringify({
        pod,
        namespace: namespace || 'default',
        container: container || 'default',
        lines: tail,
        logs: output
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to get logs for ${pod}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scale(args: Record<string, unknown>): Promise<string> {
    const deployment = args.deployment as string;
    const replicas = args.replicas as number;
    const namespace = args.namespace as string | undefined;

    if (!deployment || replicas === undefined) {
      throw new Error('Deployment name and replicas are required');
    }

    try {
      let command = `scale deployment ${deployment} --replicas=${replicas}`;
      
      if (namespace) {
        command += ` -n ${namespace}`;
      }

      const output = await this.kubectl(command);

      return JSON.stringify({
        status: 'scaled',
        deployment,
        namespace: namespace || 'default',
        replicas,
        output: output.trim(),
        message: `Deployment ${deployment} scaled to ${replicas} replicas`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to scale ${deployment}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateAge(timestamp: string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
