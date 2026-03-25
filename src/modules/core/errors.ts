export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ExportError extends AppError {
  constructor(message: string) {
    super(message, 'EXPORT_ERROR');
    this.name = 'ExportError';
  }
}

export class AudioError extends AppError {
  constructor(message: string) {
    super(message, 'AUDIO_ERROR');
    this.name = 'AudioError';
  }
}
