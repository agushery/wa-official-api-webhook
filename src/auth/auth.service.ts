import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AuthService {
  private readonly apiKeyHashes: Buffer[];

  constructor(private readonly configService: ConfigService) {
    this.apiKeyHashes = this.configService.allowedApiKeyHashes;
  }

  validateApiKey(rawDigest: string | undefined | null): boolean {
    if (!rawDigest) {
      return false;
    }

    const digest = rawDigest.trim();
    if (!/^[a-f0-9]{64}$/i.test(digest)) {
      return false;
    }

    const candidateHash = Buffer.from(digest, 'hex');
    return this.apiKeyHashes.some((storedHash) => timingSafeEqual(storedHash, candidateHash));
  }
}
