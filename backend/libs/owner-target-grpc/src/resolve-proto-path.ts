import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Resolves `owner_target.proto` for Nest gRPC (server + ClientGrpc).
 * Docker: copy `libs/owner-target-grpc/proto` into the image (see Dockerfiles)
 * or set `OWNER_TARGET_PROTO_PATH` to an absolute path.
 */
export function resolveOwnerTargetProtoPath(): string {
  const fromEnv = process.env.OWNER_TARGET_PROTO_PATH;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  const cwd = process.cwd();
  const candidates = [
    join(cwd, 'libs/owner-target-grpc/proto/owner_target.proto'),
    join(cwd, '..', 'libs/owner-target-grpc/proto/owner_target.proto'),
    join(cwd, '..', '..', 'libs/owner-target-grpc/proto/owner_target.proto'),
    // Built apps: dist/apps/<app>/src → repo root
    join(__dirname, '../../../../libs/owner-target-grpc/proto/owner_target.proto'),
    join(__dirname, '../../../../../libs/owner-target-grpc/proto/owner_target.proto'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    `owner_target.proto not found. Set OWNER_TARGET_PROTO_PATH to the .proto file. cwd=${cwd} __dirname=${__dirname}`,
  );
}
