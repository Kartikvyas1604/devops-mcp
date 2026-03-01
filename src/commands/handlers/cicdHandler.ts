import { CommandHandler } from '../commandRegistry';
import { CIService } from '../../providers/ciService';
import { Logger } from '../../services/loggingService';

const ciService = new CIService();
const logger = new Logger();

export const handleCreatePipeline: CommandHandler = async (pipelineConfig) => {
    try {
        const result = await ciService.createPipeline(pipelineConfig);
        logger.log(`Pipeline created successfully: ${result}`);
        return result;
    } catch (error) {
        logger.error(`Failed to create pipeline: ${error.message}`);
        throw error;
    }
};

export const handleTriggerPipeline: CommandHandler = async (pipelineId) => {
    try {
        const result = await ciService.triggerPipeline(pipelineId);
        logger.log(`Pipeline triggered successfully: ${result}`);
        return result;
    } catch (error) {
        logger.error(`Failed to trigger pipeline: ${error.message}`);
        throw error;
    }
};

export const handleGetPipelineStatus: CommandHandler = async (pipelineId) => {
    try {
        const status = await ciService.getPipelineStatus(pipelineId);
        logger.log(`Pipeline status retrieved: ${status}`);
        return status;
    } catch (error) {
        logger.error(`Failed to get pipeline status: ${error.message}`);
        throw error;
    }
};