import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const rawEndpoint = this.config.getOrThrow<string>('S3_ENDPOINT');
    const endpoint = rawEndpoint.startsWith('http') ? rawEndpoint : `https://${rawEndpoint}`;

    this.client = new S3Client({
      endpoint,
      region: this.config.get('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
    this.bucket = this.config.getOrThrow('S3_BUCKET');
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  getPublicUrl(key: string): string {
    const rawEndpoint = this.config.getOrThrow<string>('S3_ENDPOINT');
    const endpoint = rawEndpoint.startsWith('http') ? rawEndpoint : `https://${rawEndpoint}`;
    return `${endpoint}/${this.bucket}/${key}`;
  }
}
