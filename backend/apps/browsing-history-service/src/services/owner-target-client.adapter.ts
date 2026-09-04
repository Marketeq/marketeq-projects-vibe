import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientGrpc,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { resolveOwnerTargetProtoPath } from '@libs/owner-target-grpc';
import { firstValueFrom, Observable } from 'rxjs';
import {
  OwnerTargetMetadataResponse,
  OwnerTargetClientPort,
  OwnerTargetValidationRequest,
  OwnerTargetValidationResponse,
} from './owner-target-client.port';

/** gRPC stub (protobufjs camelCase field names on the wire via Nest loader). */
interface OwnerTargetGrpcStub {
  validateTarget(data: {
    targetType: string;
    targetId: string;
  }): Observable<{
    exists: boolean;
    displayName: string;
    status: string;
  }>;
  getTargetMetadata(data: {
    targetType: string;
    targetId: string;
  }): Observable<{ title: string; skills: string[] }>;
}

function buildGrpcUrl(host: string, port: number): string {
  const h = host.replace(/^grpc:\/\//, '');
  return `${h}:${port}`;
}

/** Resolves project/service/team items — same contract favorites-service already consumes. */
@Injectable()
export class ListingOwnerTargetClientAdapter
  implements OwnerTargetClientPort, OnModuleInit
{
  private readonly logger = new Logger(ListingOwnerTargetClientAdapter.name);
  private stub!: OwnerTargetGrpcStub;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const protoPath = resolveOwnerTargetProtoPath();
    const host =
      this.configService.get<string>('LISTINGS_SERVICE_GRPC_HOST') ||
      this.configService.get<string>('LISTING_SERVICE_GRPC_HOST') ||
      'localhost';
    const port = Number(
      this.configService.get<string>('LISTINGS_SERVICE_GRPC_PORT') ||
        this.configService.get<string>('LISTING_SERVICE_GRPC_PORT') ||
        '50052',
    );
    const url = buildGrpcUrl(host, port);
    const client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'owner_target',
        protoPath,
        url,
      },
    }) as ClientGrpc;
    this.stub = client.getService<OwnerTargetGrpcStub>('OwnerTargetService');
    this.logger.debug(`Listing owner-target gRPC client → ${url}`);
  }

  async validateTarget(
    payload: OwnerTargetValidationRequest,
  ): Promise<OwnerTargetValidationResponse> {
    return firstValueFrom(
      this.stub.validateTarget({
        targetType: payload.targetType,
        targetId: payload.targetId,
      }),
    );
  }

  async getTargetMetadata(
    payload: OwnerTargetValidationRequest,
  ): Promise<OwnerTargetMetadataResponse> {
    return firstValueFrom(
      this.stub.getTargetMetadata({
        targetType: payload.targetType,
        targetId: payload.targetId,
      }),
    );
  }
}

/** Resolves talent (user) items — same contract favorites-service already consumes. */
@Injectable()
export class UserOwnerTargetClientAdapter
  implements OwnerTargetClientPort, OnModuleInit
{
  private readonly logger = new Logger(UserOwnerTargetClientAdapter.name);
  private stub!: OwnerTargetGrpcStub;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const protoPath = resolveOwnerTargetProtoPath();
    const host =
      this.configService.get<string>('USER_SERVICE_GRPC_HOST') ||
      this.configService.get<string>('USER_SERVICE_HOST') ||
      'localhost';
    const port = Number(
      this.configService.get<string>('USER_SERVICE_GRPC_PORT') || '50051',
    );
    const url = buildGrpcUrl(host, port);
    const client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'owner_target',
        protoPath,
        url,
      },
    }) as ClientGrpc;
    this.stub = client.getService<OwnerTargetGrpcStub>('OwnerTargetService');
    this.logger.debug(`User owner-target gRPC client → ${url}`);
  }

  async validateTarget(
    payload: OwnerTargetValidationRequest,
  ): Promise<OwnerTargetValidationResponse> {
    return firstValueFrom(
      this.stub.validateTarget({
        targetType: payload.targetType,
        targetId: payload.targetId,
      }),
    );
  }

  async getTargetMetadata(
    payload: OwnerTargetValidationRequest,
  ): Promise<OwnerTargetMetadataResponse> {
    return firstValueFrom(
      this.stub.getTargetMetadata({
        targetType: payload.targetType,
        targetId: payload.targetId,
      }),
    );
  }
}
