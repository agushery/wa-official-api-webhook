import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly authService: AuthService) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);



    if (!apiKey || !this.authService.validateApiKey(apiKey)) {
      throw new UnauthorizedException('API key authentication failed');
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {


    const headerValue = request.get('authorization');


    if (headerValue) {
      const [schema, value] = headerValue.split(' ');
      if (schema?.toLowerCase() === 'bearer' && value) {
        return value;
      }
    }

    const apiKeyHeader = request.get('x-api-key');

    if (apiKeyHeader && apiKeyHeader.length > 0) {
      return apiKeyHeader;
    }

    return undefined;
  }
}
