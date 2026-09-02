import { HttpException, HttpStatus } from '@nestjs/common';

export enum ParseErrorCode {
  MISSING_FILE = 'MISSING_FILE',
  EMPTY_FILE = 'EMPTY_FILE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  PASSWORD_PROTECTED = 'PASSWORD_PROTECTED',
  UNREADABLE_DOCUMENT = 'UNREADABLE_DOCUMENT',
  DOCUMENT_TOO_LONG = 'DOCUMENT_TOO_LONG',
  SERVICE_OVERLOADED = 'SERVICE_OVERLOADED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  DEADLINE_EXCEEDED = 'DEADLINE_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class ParseException extends HttpException {
  public readonly errorCode: ParseErrorCode;
  public readonly retryable: boolean;

  private constructor(
    errorCode: ParseErrorCode,
    status: HttpStatus,
    message: string,
    retryable: boolean,
  ) {
    super({ errorCode, message }, status);
    this.errorCode = errorCode;
    this.retryable = retryable;
  }

  static missingFile(): ParseException {
    return new ParseException(
      ParseErrorCode.MISSING_FILE,
      HttpStatus.BAD_REQUEST,
      'No file provided in the request',
      false,
    );
  }

  static emptyFile(): ParseException {
    return new ParseException(
      ParseErrorCode.EMPTY_FILE,
      HttpStatus.BAD_REQUEST,
      'The uploaded file is empty',
      false,
    );
  }

  static unauthorized(): ParseException {
    return new ParseException(
      ParseErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
      'Invalid or missing service authentication token',
      false,
    );
  }

  static fileTooLarge(maxBytes: number): ParseException {
    return new ParseException(
      ParseErrorCode.FILE_TOO_LARGE,
      HttpStatus.PAYLOAD_TOO_LARGE,
      `File exceeds the maximum size of ${Math.round(maxBytes / 1024 / 1024)}MB`,
      false,
    );
  }

  static unsupportedType(mimeType: string): ParseException {
    return new ParseException(
      ParseErrorCode.UNSUPPORTED_TYPE,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      `Unsupported file type: ${mimeType}. Only PDF, DOC, and DOCX are accepted`,
      false,
    );
  }

  static typeMismatch(claimed: string, detected: string): ParseException {
    return new ParseException(
      ParseErrorCode.TYPE_MISMATCH,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      `File type mismatch: claimed ${claimed} but detected ${detected}`,
      false,
    );
  }

  static passwordProtected(): ParseException {
    return new ParseException(
      ParseErrorCode.PASSWORD_PROTECTED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The document is password-protected and cannot be read',
      false,
    );
  }

  static unreadableDocument(): ParseException {
    return new ParseException(
      ParseErrorCode.UNREADABLE_DOCUMENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The document could not be read or is corrupted',
      false,
    );
  }

  static documentTooLong(chars: number, max: number): ParseException {
    return new ParseException(
      ParseErrorCode.DOCUMENT_TOO_LONG,
      HttpStatus.UNPROCESSABLE_ENTITY,
      `Document contains ${chars} characters, exceeding the maximum of ${max}`,
      false,
    );
  }

  static serviceOverloaded(): ParseException {
    return new ParseException(
      ParseErrorCode.SERVICE_OVERLOADED,
      HttpStatus.TOO_MANY_REQUESTS,
      'Service is currently overloaded, please retry',
      true,
    );
  }

  static modelUnavailable(): ParseException {
    return new ParseException(
      ParseErrorCode.MODEL_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      'The extraction model is currently unavailable',
      true,
    );
  }

  static deadlineExceeded(): ParseException {
    return new ParseException(
      ParseErrorCode.DEADLINE_EXCEEDED,
      HttpStatus.GATEWAY_TIMEOUT,
      'Request processing exceeded the time limit',
      true,
    );
  }

  static internal(detail?: string): ParseException {
    return new ParseException(
      ParseErrorCode.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      detail || 'An unexpected error occurred during parsing',
      false,
    );
  }
}
