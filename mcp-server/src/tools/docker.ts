/**
 * Docker tool implementations for MCP server
 */

import Docker from 'dockerode';

export class DockerTools {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async execute(tool: string, args: Record<string, unknown>): Promise<string> {
    switch (tool) {
      case 'docker_list_containers':
        return this.listContainers(args);
      case 'docker_run_container':
        return this.runContainer(args);
      case 'docker_stop_container':
        return this.stopContainer(args);
      case 'docker_remove_container':
        return this.removeContainer(args);
      case 'docker_container_logs':
        return this.getContainerLogs(args);
      case 'docker_build_image':
        return this.buildImage(args);
      case 'docker_list_images':
        return this.listImages(args);
      case 'docker_push_image':
        return this.pushImage(args);
      default:
        throw new Error(`Unknown Docker tool: ${tool}`);
    }
  }

  private async listContainers(args: Record<string, unknown>): Promise<string> {
    const all = args.all as boolean ?? false;
    const filters = args.filters as Record<string, string[]> | undefined;

    try {
      const containers = await this.docker.listContainers({ all, filters });
      
      if (containers.length === 0) {
        return 'No containers found';
      }

      const formatted = containers.map(c => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace(/^\//, '') || 'unnamed',
        image: c.Image,
        status: c.Status,
        state: c.State,
        ports: c.Ports.map(p => 
          p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`
        ).join(', ') || 'none',
        created: new Date(c.Created * 1000).toISOString()
      }));

      return JSON.stringify(formatted, null, 2);
    } catch (error) {
      throw new Error(`Failed to list containers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runContainer(args: Record<string, unknown>): Promise<string> {
    const image = args.image as string;
    const name = args.name as string | undefined;
    const ports = args.ports as string[] | undefined;
    const env = args.env as Record<string, string> | undefined;
    const volumes = args.volumes as string[] | undefined;
    const detach = args.detach as boolean ?? true;

    if (!image) {
      throw new Error('Image is required');
    }

    try {
      // Parse port bindings
      const portBindings: Record<string, { HostPort: string }[]> = {};
      const exposedPorts: Record<string, object> = {};
      
      if (ports) {
        for (const port of ports) {
          const [hostPort, containerPort] = port.split(':');
          const cPort = `${containerPort}/tcp`;
          exposedPorts[cPort] = {};
          portBindings[cPort] = [{ HostPort: hostPort }];
        }
      }

      // Parse environment variables
      const envArray = env 
        ? Object.entries(env).map(([k, v]) => `${k}=${v}`)
        : [];

      // Parse volumes
      const binds = volumes || [];

      const container = await this.docker.createContainer({
        Image: image,
        name,
        ExposedPorts: exposedPorts,
        Env: envArray,
        HostConfig: {
          PortBindings: portBindings,
          Binds: binds
        }
      });

      if (detach) {
        await container.start();
        const info = await container.inspect();
        return JSON.stringify({
          id: info.Id.substring(0, 12),
          name: info.Name.replace(/^\//, ''),
          status: 'running',
          message: `Container ${info.Name} started successfully`
        }, null, 2);
      } else {
        const stream = await container.attach({
          stream: true,
          stdout: true,
          stderr: true
        });
        await container.start();
        
        return new Promise((resolve) => {
          let output = '';
          stream.on('data', (chunk: Buffer) => {
            output += chunk.toString();
          });
          stream.on('end', () => {
            resolve(output || 'Container completed');
          });
        });
      }
    } catch (error) {
      throw new Error(`Failed to run container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async stopContainer(args: Record<string, unknown>): Promise<string> {
    const containerId = args.container as string;
    const timeout = args.timeout as number ?? 10;

    if (!containerId) {
      throw new Error('Container ID or name is required');
    }

    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
      
      return JSON.stringify({
        container: containerId,
        status: 'stopped',
        message: `Container ${containerId} stopped successfully`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to stop container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async removeContainer(args: Record<string, unknown>): Promise<string> {
    const containerId = args.container as string;
    const force = args.force as boolean ?? false;
    const removeVolumes = args.volumes as boolean ?? false;

    if (!containerId) {
      throw new Error('Container ID or name is required');
    }

    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force, v: removeVolumes });
      
      return JSON.stringify({
        container: containerId,
        status: 'removed',
        message: `Container ${containerId} removed successfully`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to remove container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getContainerLogs(args: Record<string, unknown>): Promise<string> {
    const containerId = args.container as string;
    const tail = args.tail as number ?? 100;
    const since = args.since as string | undefined;

    if (!containerId) {
      throw new Error('Container ID or name is required');
    }

    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        since: since ? Math.floor(new Date(since).getTime() / 1000) : undefined
      });

      // Docker logs come with a header for each line
      const logString = logs.toString();
      return logString || 'No logs available';
    } catch (error) {
      throw new Error(`Failed to get container logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async buildImage(args: Record<string, unknown>): Promise<string> {
    const path = args.path as string;
    const dockerfile = args.dockerfile as string ?? 'Dockerfile';
    const tag = args.tag as string;
    const buildArgs = args.buildArgs as Record<string, string> | undefined;
    const noCache = args.noCache as boolean ?? false;

    if (!path || !tag) {
      throw new Error('Path and tag are required');
    }

    try {
      const stream = await this.docker.buildImage(
        { context: path, src: ['.'] },
        {
          dockerfile,
          t: tag,
          buildargs: buildArgs,
          nocache: noCache
        }
      );

      return new Promise((resolve, reject) => {
        const logs: string[] = [];
        
        stream.on('data', (chunk: Buffer) => {
          const data = JSON.parse(chunk.toString());
          if (data.stream) {
            logs.push(data.stream);
          } else if (data.error) {
            reject(new Error(data.error));
          }
        });

        stream.on('end', () => {
          resolve(JSON.stringify({
            image: tag,
            status: 'built',
            message: `Image ${tag} built successfully`,
            logs: logs.slice(-20) // Last 20 log lines
          }, null, 2));
        });

        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to build image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async listImages(args: Record<string, unknown>): Promise<string> {
    const all = args.all as boolean ?? false;
    const filters = args.filters as Record<string, string[]> | undefined;

    try {
      const images = await this.docker.listImages({ all, filters });
      
      if (images.length === 0) {
        return 'No images found';
      }

      const formatted = images.map(img => ({
        id: img.Id.replace('sha256:', '').substring(0, 12),
        tags: img.RepoTags || ['<none>'],
        size: `${Math.round(img.Size / 1024 / 1024)}MB`,
        created: new Date(img.Created * 1000).toISOString()
      }));

      return JSON.stringify(formatted, null, 2);
    } catch (error) {
      throw new Error(`Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async pushImage(args: Record<string, unknown>): Promise<string> {
    const image = args.image as string;
    const registry = args.registry as string | undefined;

    if (!image) {
      throw new Error('Image name is required');
    }

    try {
      const imageRef = this.docker.getImage(image);
      const stream = await imageRef.push({});

      return new Promise((resolve, reject) => {
        const logs: string[] = [];
        
        stream.on('data', (chunk: Buffer) => {
          const data = JSON.parse(chunk.toString());
          if (data.status) {
            logs.push(data.status);
          } else if (data.error) {
            reject(new Error(data.error));
          }
        });

        stream.on('end', () => {
          resolve(JSON.stringify({
            image,
            registry: registry || 'Docker Hub',
            status: 'pushed',
            message: `Image ${image} pushed successfully`
          }, null, 2));
        });

        stream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to push image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
