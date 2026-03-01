/**
 * Enhanced Docker Integration Client
 * 
 * Uses Dockerode for comprehensive Docker API access:
 * - Container lifecycle management
 * - Image building and management
 * - Volume and network management
 * - Docker Compose support
 * - Real-time container logs and stats
 */

import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { LoggingService } from '../services/loggingService';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{ host: number; container: number; protocol: string }>;
  created: Date;
  startedAt?: Date;
  networks: string[];
  mounts: string[];
}

export interface ImageInfo {
  id: string;
  tags: string[];
  size: number;
  created: Date;
  labels: Record<string, string>;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
}

export interface RunContainerOptions {
  image: string;
  name?: string;
  command?: string[];
  env?: Record<string, string>;
  ports?: Array<{ host: number; container: number; protocol?: string }>;
  volumes?: Array<{ host: string; container: string; mode?: string }>;
  network?: string;
  labels?: Record<string, string>;
  restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  memory?: number;
  cpus?: number;
  detach?: boolean;
}

export interface BuildImageOptions {
  context: string;
  dockerfile?: string;
  tag: string;
  buildArgs?: Record<string, string>;
  labels?: Record<string, string>;
  noCache?: boolean;
  pull?: boolean;
  target?: string;
}

export class DockerIntegration extends EventEmitter {
  private docker: Docker;
  private logger: LoggingService;
  private connected: boolean = false;

  constructor(logger: LoggingService, socketPath?: string) {
    super();
    this.logger = logger;
    
    // Auto-detect Docker socket
    const defaultSocket = process.platform === 'win32' 
      ? '//./pipe/docker_engine'
      : '/var/run/docker.sock';
    
    this.docker = new Docker({
      socketPath: socketPath || defaultSocket
    });
  }

  async connect(): Promise<boolean> {
    try {
      await this.docker.ping();
      this.connected = true;
      this.logger.info('Docker connected successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to Docker', error);
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Container operations
  async listContainers(all: boolean = true): Promise<ContainerInfo[]> {
    const containers = await this.docker.listContainers({ all });
    
    return containers.map(c => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace(/^\//, '') || 'unnamed',
      image: c.Image,
      status: c.Status,
      state: c.State,
      ports: c.Ports.map(p => ({
        host: p.PublicPort || 0,
        container: p.PrivatePort,
        protocol: p.Type
      })),
      created: new Date(c.Created * 1000),
      networks: Object.keys(c.NetworkSettings?.Networks || {}),
      mounts: c.Mounts?.map(m => `${m.Source}:${m.Destination}`) || []
    }));
  }

  async getContainer(idOrName: string): Promise<ContainerInfo | null> {
    try {
      const container = this.docker.getContainer(idOrName);
      const info = await container.inspect();
      
      return {
        id: info.Id.substring(0, 12),
        name: info.Name.replace(/^\//, ''),
        image: info.Config.Image,
        status: info.State.Status,
        state: info.State.Running ? 'running' : 'stopped',
        ports: Object.entries(info.NetworkSettings.Ports || {}).flatMap(([port, bindings]) => {
          const [containerPort, protocol] = port.split('/');
          return (bindings || []).map(b => ({
            host: parseInt(b.HostPort),
            container: parseInt(containerPort),
            protocol
          }));
        }),
        created: new Date(info.Created),
        startedAt: info.State.StartedAt ? new Date(info.State.StartedAt) : undefined,
        networks: Object.keys(info.NetworkSettings.Networks || {}),
        mounts: info.Mounts?.map(m => `${m.Source}:${m.Destination}`) || []
      };
    } catch (error) {
      return null;
    }
  }

  async runContainer(options: RunContainerOptions): Promise<ContainerInfo> {
    const {
      image,
      name,
      command,
      env,
      ports,
      volumes,
      network,
      labels,
      restart,
      memory,
      cpus,
      detach = true
    } = options;

    // Prepare port bindings
    const exposedPorts: Record<string, object> = {};
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
    
    if (ports) {
      for (const port of ports) {
        const protocol = port.protocol || 'tcp';
        const key = `${port.container}/${protocol}`;
        exposedPorts[key] = {};
        portBindings[key] = [{ HostPort: String(port.host) }];
      }
    }

    // Prepare volume bindings
    const binds: string[] = [];
    if (volumes) {
      for (const vol of volumes) {
        binds.push(`${vol.host}:${vol.container}${vol.mode ? ':' + vol.mode : ''}`);
      }
    }

    // Prepare environment variables
    const envArray = env 
      ? Object.entries(env).map(([k, v]) => `${k}=${v}`)
      : [];

    // Create container
    const container = await this.docker.createContainer({
      Image: image,
      name,
      Cmd: command,
      Env: envArray,
      ExposedPorts: exposedPorts,
      Labels: labels,
      HostConfig: {
        PortBindings: portBindings,
        Binds: binds,
        NetworkMode: network,
        RestartPolicy: restart ? { Name: restart } : undefined,
        Memory: memory,
        NanoCpus: cpus ? cpus * 1e9 : undefined
      }
    });

    if (detach) {
      await container.start();
    }

    const info = await container.inspect();
    
    this.logger.info(`Container ${name || info.Id.substring(0, 12)} started`);

    return {
      id: info.Id.substring(0, 12),
      name: info.Name.replace(/^\//, ''),
      image,
      status: 'running',
      state: 'running',
      ports: ports?.map(p => ({
        host: p.host,
        container: p.container,
        protocol: p.protocol || 'tcp'
      })) || [],
      created: new Date(info.Created),
      startedAt: new Date(),
      networks: [network || 'bridge'],
      mounts: binds
    };
  }

  async startContainer(idOrName: string): Promise<void> {
    const container = this.docker.getContainer(idOrName);
    await container.start();
    this.logger.info(`Container ${idOrName} started`);
  }

  async stopContainer(idOrName: string, timeout?: number): Promise<void> {
    const container = this.docker.getContainer(idOrName);
    await container.stop({ t: timeout });
    this.logger.info(`Container ${idOrName} stopped`);
  }

  async restartContainer(idOrName: string): Promise<void> {
    const container = this.docker.getContainer(idOrName);
    await container.restart();
    this.logger.info(`Container ${idOrName} restarted`);
  }

  async removeContainer(idOrName: string, force: boolean = false, removeVolumes: boolean = false): Promise<void> {
    const container = this.docker.getContainer(idOrName);
    await container.remove({ force, v: removeVolumes });
    this.logger.info(`Container ${idOrName} removed`);
  }

  async getContainerLogs(idOrName: string, options: {
    tail?: number;
    since?: number;
    timestamps?: boolean;
    follow?: boolean;
  } = {}): Promise<string> {
    const container = this.docker.getContainer(idOrName);
    
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail || 100,
      since: options.since,
      timestamps: options.timestamps,
      follow: false
    });

    return logs.toString('utf-8');
  }

  async streamContainerLogs(idOrName: string, onLog: (log: string) => void): Promise<() => void> {
    const container = this.docker.getContainer(idOrName);
    
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      tail: 10
    });

    stream.on('data', (chunk: Buffer) => {
      onLog(chunk.toString('utf-8'));
    });

    return () => {
      stream.destroy();
    };
  }

  async getContainerStats(idOrName: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(idOrName);
    const stats = await container.stats({ stream: false });

    // Calculate CPU percentage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;
    const cpuPercent = (cpuDelta / systemDelta) * numCpus * 100;

    // Memory stats
    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimit = stats.memory_stats.limit || 1;
    const memoryPercent = (memoryUsage / memoryLimit) * 100;

    // Network stats
    let networkRx = 0;
    let networkTx = 0;
    if (stats.networks) {
      for (const net of Object.values(stats.networks)) {
        networkRx += (net as { rx_bytes: number }).rx_bytes;
        networkTx += (net as { tx_bytes: number }).tx_bytes;
      }
    }

    // Block I/O stats
    let blockRead = 0;
    let blockWrite = 0;
    if (stats.blkio_stats?.io_service_bytes_recursive) {
      for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
        if (entry.op === 'read') {
          blockRead += entry.value;
        } else if (entry.op === 'write') {
          blockWrite += entry.value;
        }
      }
    }

    return {
      cpuPercent,
      memoryUsage,
      memoryLimit,
      memoryPercent,
      networkRx,
      networkTx,
      blockRead,
      blockWrite
    };
  }

  async execInContainer(idOrName: string, command: string[]): Promise<{ exitCode: number; output: string }> {
    const container = this.docker.getContainer(idOrName);
    
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    
    return new Promise((resolve) => {
      let output = '';
      
      stream.on('data', (chunk: Buffer) => {
        output += chunk.toString('utf-8');
      });

      stream.on('end', async () => {
        const inspect = await exec.inspect();
        resolve({
          exitCode: inspect.ExitCode || 0,
          output
        });
      });
    });
  }

  // Image operations
  async listImages(all: boolean = false): Promise<ImageInfo[]> {
    const images = await this.docker.listImages({ all });
    
    return images.map(img => ({
      id: img.Id.replace('sha256:', '').substring(0, 12),
      tags: img.RepoTags || [],
      size: img.Size,
      created: new Date(img.Created * 1000),
      labels: img.Labels || {}
    }));
  }

  async pullImage(imageName: string, onProgress?: (progress: { status: string; progress?: string }) => void): Promise<void> {
    const stream = await this.docker.pull(imageName);
    
    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            this.logger.info(`Image ${imageName} pulled successfully`);
            resolve();
          }
        },
        (event: { status: string; progress?: string }) => {
          if (onProgress) {
            onProgress(event);
          }
        }
      );
    });
  }

  async buildImage(options: BuildImageOptions, onProgress?: (output: string) => void): Promise<void> {
    const {
      context,
      dockerfile = 'Dockerfile',
      tag,
      buildArgs,
      labels,
      noCache = false,
      pull = false,
      target
    } = options;

    const stream = await this.docker.buildImage(
      {
        context,
        src: ['.']
      },
      {
        dockerfile,
        t: tag,
        buildargs: buildArgs,
        labels,
        nocache: noCache,
        pull,
        target
      }
    );

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        try {
          const output = JSON.parse(chunk.toString());
          if (output.stream && onProgress) {
            onProgress(output.stream);
          }
          if (output.error) {
            reject(new Error(output.error));
          }
        } catch {
          // Ignore JSON parse errors
        }
      });

      stream.on('end', () => {
        this.logger.info(`Image ${tag} built successfully`);
        resolve();
      });

      stream.on('error', reject);
    });
  }

  async removeImage(idOrTag: string, force: boolean = false): Promise<void> {
    const image = this.docker.getImage(idOrTag);
    await image.remove({ force });
    this.logger.info(`Image ${idOrTag} removed`);
  }

  async tagImage(sourceImage: string, repo: string, tag: string): Promise<void> {
    const image = this.docker.getImage(sourceImage);
    await image.tag({ repo, tag });
  }

  async pushImage(imageName: string, authconfig?: { username: string; password: string; serveraddress?: string }): Promise<void> {
    const image = this.docker.getImage(imageName);
    const stream = await image.push({ authconfig });
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        const output = JSON.parse(chunk.toString());
        if (output.error) {
          reject(new Error(output.error));
        }
      });

      stream.on('end', () => {
        this.logger.info(`Image ${imageName} pushed successfully`);
        resolve();
      });

      stream.on('error', reject);
    });
  }

  // Network operations
  async listNetworks(): Promise<Array<{ id: string; name: string; driver: string; scope: string }>> {
    const networks = await this.docker.listNetworks();
    return networks.map(n => ({
      id: n.Id.substring(0, 12),
      name: n.Name,
      driver: n.Driver,
      scope: n.Scope
    }));
  }

  async createNetwork(name: string, driver: string = 'bridge'): Promise<string> {
    const network = await this.docker.createNetwork({
      Name: name,
      Driver: driver
    });
    return network.id;
  }

  async removeNetwork(idOrName: string): Promise<void> {
    const network = this.docker.getNetwork(idOrName);
    await network.remove();
  }

  // Volume operations
  async listVolumes(): Promise<Array<{ name: string; driver: string; mountpoint: string }>> {
    const volumes = await this.docker.listVolumes();
    return volumes.Volumes?.map(v => ({
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint
    })) || [];
  }

  async createVolume(name: string, driver: string = 'local'): Promise<string> {
    const volume = await this.docker.createVolume({
      Name: name,
      Driver: driver
    });
    return volume.name;
  }

  async removeVolume(name: string): Promise<void> {
    const volume = this.docker.getVolume(name);
    await volume.remove();
  }

  // System operations
  async getSystemInfo(): Promise<{
    containers: number;
    images: number;
    serverVersion: string;
    operatingSystem: string;
    architecture: string;
    cpus: number;
    totalMemory: number;
  }> {
    const info = await this.docker.info();
    return {
      containers: info.Containers,
      images: info.Images,
      serverVersion: info.ServerVersion,
      operatingSystem: info.OperatingSystem,
      architecture: info.Architecture,
      cpus: info.NCPU,
      totalMemory: info.MemTotal
    };
  }

  async pruneContainers(): Promise<{ containersDeleted: string[]; spaceReclaimed: number }> {
    const result = await this.docker.pruneContainers();
    return {
      containersDeleted: result.ContainersDeleted || [],
      spaceReclaimed: result.SpaceReclaimed || 0
    };
  }

  async pruneImages(): Promise<{ imagesDeleted: string[]; spaceReclaimed: number }> {
    const result = await this.docker.pruneImages();
    return {
      imagesDeleted: result.ImagesDeleted?.map(i => i.Deleted || i.Untagged || '') || [],
      spaceReclaimed: result.SpaceReclaimed || 0
    };
  }

  async pruneVolumes(): Promise<{ volumesDeleted: string[]; spaceReclaimed: number }> {
    const result = await this.docker.pruneVolumes();
    return {
      volumesDeleted: result.VolumesDeleted || [],
      spaceReclaimed: result.SpaceReclaimed || 0
    };
  }
}
