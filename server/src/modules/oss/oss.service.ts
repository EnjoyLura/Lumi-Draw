import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OssService {
  private client: any;

  constructor(private configService: ConfigService) {
    // Lazy init ali-oss client
    try {
      const OSS = require('ali-oss');
      this.client = new OSS({
        region: configService.get('OSS_REGION') || 'oss-cn-beijing',
        accessKeyId: configService.get('OSS_ACCESS_KEY_ID'),
        accessKeySecret: configService.get('OSS_ACCESS_KEY_SECRET'),
        bucket: configService.get('OSS_BUCKET') || 'lumidraw',
      });
    } catch {
      console.warn('ali-oss not installed, OSS uploads disabled');
    }
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    if (!this.client) return `https://${this.configService.get('OSS_BUCKET')}.${this.configService.get('OSS_ENDPOINT')}/${key}`;
    const result = await this.client.put(key, buffer);
    return result.url;
  }
}
