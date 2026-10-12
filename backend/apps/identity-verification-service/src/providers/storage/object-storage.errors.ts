// Error types for ObjectStorageProvider.getObject only. Plain Error
// subclasses, not NestJS HttpException/DomainException: getObject has no
// caller yet (see the provider file's header) and therefore no HTTP
// boundary to translate these into — that mapping is a decision for
// whatever eventually calls this method, not this file's to make.

export abstract class ObjectStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// The object key does not exist in the bucket. Never includes the caller's
// credentials or the bucket contents in the message — only the key, which
// the caller already supplied.
export class ObjectNotFoundError extends ObjectStorageError {
  constructor(public readonly objectKey: string) {
    super(`Object not found: ${objectKey}`);
  }
}

// The object is larger than the caller's declared maxBytes. Thrown as soon
// as this is known — either from the response's declared Content-Length
// (before a single byte of the body is read) or, as a defense-in-depth
// fallback, the moment the running total crosses maxBytes while streaming.
// Never carries the object's bytes.
export class ObjectTooLargeError extends ObjectStorageError {
  constructor(
    public readonly objectKey: string,
    public readonly maxBytes: number,
  ) {
    super(`Object exceeds the ${maxBytes}-byte limit: ${objectKey}`);
  }
}

// The read started but the stream ended in error before completing —
// a dropped connection, a reset, etc. Distinct from ObjectNotFoundError
// (never started) and ObjectStorageUnavailableError (never even got a
// response). Never logs or carries the partial bytes already read.
export class ObjectReadInterruptedError extends ObjectStorageError {
  constructor(
    public readonly objectKey: string,
    public readonly cause?: unknown,
  ) {
    super(`Object read was interrupted: ${objectKey}`);
  }
}

// The storage backend itself couldn't be reached or rejected the request
// for a reason other than a missing key (auth failure, network error,
// service outage). Never logs or carries R2 credentials.
export class ObjectStorageUnavailableError extends ObjectStorageError {
  constructor(public readonly cause?: unknown) {
    super('Object storage is temporarily unavailable');
  }
}
