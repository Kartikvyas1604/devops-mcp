/**
 * Git tool implementations for MCP server
 */

import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

export class GitTools {
  async execute(tool: string, args: Record<string, unknown>): Promise<string> {
    switch (tool) {
      case 'git_status':
        return this.status(args);
      case 'git_commit':
        return this.commit(args);
      case 'git_push':
        return this.push(args);
      case 'git_pull':
        return this.pull(args);
      case 'git_branch':
        return this.branch(args);
      default:
        throw new Error(`Unknown Git tool: ${tool}`);
    }
  }

  private getGit(path?: string): SimpleGit {
    return simpleGit(path || process.cwd());
  }

  private async status(args: Record<string, unknown>): Promise<string> {
    const path = args.path as string | undefined;
    const git = this.getGit(path);

    try {
      const status: StatusResult = await git.status();
      
      const result = {
        branch: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        deleted: status.deleted,
        untracked: status.not_added,
        conflicted: status.conflicted,
        isClean: status.isClean()
      };

      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async commit(args: Record<string, unknown>): Promise<string> {
    const message = args.message as string;
    const path = args.path as string | undefined;
    const all = args.all as boolean ?? false;

    if (!message) {
      throw new Error('Commit message is required');
    }

    const git = this.getGit(path);

    try {
      if (all) {
        await git.add('-A');
      }

      const result = await git.commit(message);
      
      return JSON.stringify({
        commit: result.commit,
        branch: result.branch,
        summary: {
          changes: result.summary.changes,
          insertions: result.summary.insertions,
          deletions: result.summary.deletions
        },
        message: `Committed ${result.commit} to ${result.branch}`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async push(args: Record<string, unknown>): Promise<string> {
    const path = args.path as string | undefined;
    const remote = args.remote as string ?? 'origin';
    const branch = args.branch as string | undefined;
    const force = args.force as boolean ?? false;

    const git = this.getGit(path);

    try {
      const options = force ? ['--force'] : [];
      
      if (branch) {
        await git.push(remote, branch, options);
      } else {
        await git.push(remote, undefined, options);
      }

      return JSON.stringify({
        status: 'pushed',
        remote,
        branch: branch || 'current',
        force,
        message: `Successfully pushed to ${remote}${branch ? `/${branch}` : ''}`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async pull(args: Record<string, unknown>): Promise<string> {
    const path = args.path as string | undefined;
    const remote = args.remote as string ?? 'origin';
    const branch = args.branch as string | undefined;
    const rebase = args.rebase as boolean ?? false;

    const git = this.getGit(path);

    try {
      const options = rebase ? ['--rebase'] : [];
      const result = await git.pull(remote, branch, options);

      return JSON.stringify({
        status: 'pulled',
        remote,
        branch: branch || 'current',
        changes: result.summary,
        files: result.files?.slice(0, 20), // Limit to 20 files
        message: `Successfully pulled from ${remote}${branch ? `/${branch}` : ''}`
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to pull: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async branch(args: Record<string, unknown>): Promise<string> {
    const path = args.path as string | undefined;
    const name = args.name as string | undefined;
    const action = args.action as 'list' | 'create' | 'delete' ?? 'list';
    const checkout = args.checkout as boolean ?? false;

    const git = this.getGit(path);

    try {
      switch (action) {
        case 'list': {
          const branches = await git.branch(['-a']);
          return JSON.stringify({
            current: branches.current,
            local: branches.branches,
            all: branches.all
          }, null, 2);
        }

        case 'create': {
          if (!name) {
            throw new Error('Branch name is required for create action');
          }
          
          if (checkout) {
            await git.checkoutLocalBranch(name);
            return JSON.stringify({
              action: 'created and checked out',
              branch: name,
              message: `Created and switched to branch '${name}'`
            }, null, 2);
          } else {
            await git.branch([name]);
            return JSON.stringify({
              action: 'created',
              branch: name,
              message: `Created branch '${name}'`
            }, null, 2);
          }
        }

        case 'delete': {
          if (!name) {
            throw new Error('Branch name is required for delete action');
          }
          
          await git.deleteLocalBranch(name);
          return JSON.stringify({
            action: 'deleted',
            branch: name,
            message: `Deleted branch '${name}'`
          }, null, 2);
        }

        default:
          throw new Error(`Unknown branch action: ${action}`);
      }
    } catch (error) {
      throw new Error(`Failed to ${action} branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
