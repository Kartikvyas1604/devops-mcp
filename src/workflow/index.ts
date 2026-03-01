/**
 * Workflow Module Export
 * Workflow automation engine and pre-built templates
 */

export {
  WorkflowEngine,
  WorkflowBuilder,
  workflowEngine,
} from './engine';

export type {
  Workflow,
  WorkflowStep,
  WorkflowRun,
  WorkflowTrigger,
  WorkflowLog,
  StepResult,
  TaskConfig,
  ParallelConfig,
  ConditionalConfig,
  ApprovalConfig,
  NotificationConfig,
} from './engine';

export {
  createCICDWorkflow,
  createK8sDeployWorkflow,
  createDbMigrationWorkflow,
  createBlueGreenWorkflow,
  createInfraWorkflow,
  createCanaryWorkflow,
  createDRWorkflow,
} from './templates';
