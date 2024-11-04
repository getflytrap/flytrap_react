import axios from 'axios';
import { LogData, RejectionValue } from "./types/types";
import { responseSchema } from "./types/schemas";
import { ZodError } from "zod";

export default class Flytrap {
  private projectId: string;
  private apiEndpoint: string;
  private apiKey: string;
  
  constructor(config: {
    projectId: string;
    apiEndpoint: string;
    apiKey: string;
  }) {
    this.projectId = config.projectId;
    this.apiEndpoint = config.apiEndpoint;
    this.apiKey = config.apiKey;
    this.setupGlobalErrorHandlers();
  }

  // * --- Private Methods --- * //
  private setupGlobalErrorHandlers(): void {
    window.addEventListener("error", (e: ErrorEvent) => 
      this.handleUncaughtException(e),
    );
    window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => 
      this.handleUnhandledRejection(e),
    );
  }

  private handleUncaughtException(e: ErrorEvent): void {
    if (e.error) {
      this.logError(e.error, false);
    }
  }

  private handleUnhandledRejection(e: PromiseRejectionEvent): void {
    const { reason } = e;

    if (reason instanceof Error) {
      this.logError(reason, false);
    } else {
      this.logRejection(reason, false);
    }
  }

  private async logRejection(value: RejectionValue, handled: boolean): Promise<void> {
    const data: LogData = {
      value,
      handled,
      timestamp: new Date().toISOString(),
      project_id: this.projectId,
    };

    try {
      console.log('[error sdk] Sending rejection to backend...');
      const response = await axios.post(
        `${this.apiEndpoint}/api/errors`,
        { data },
        { headers: { "x-api-key": this.apiKey } }
      );
      responseSchema.parse(response);
      console.log('[error sdk]', response.status, response.data);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error('[error sdk] Response validation error:', e.errors);
      } else {
        console.error('[error sdk] An error occurred sending rejection data:', e);
        throw new Error('An error occurred logging rejection data.');
      }
    }
  }

  private async logError(error: Error, handled: boolean): Promise<void> {
    const data: LogData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      handled,
      timestamp: new Date().toISOString(),
      project_id: this.projectId,
    };

    try {
      const response = await axios.post(
        `${this.apiEndpoint}/api/errors`,
        { data },
        { headers: { "x-api-key": this.apiKey } }
      );
      responseSchema.parse(response);
      console.log('[error sdk]', response.status, response.data);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error('[error sdk] Response validation error:', e.errors);
      } else {
        console.error('[error sdk] An error occurred sending error data:', e);
        throw new Error('An error occurred logging error data.');
      }
    }
  }
}