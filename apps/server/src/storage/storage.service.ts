import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type BucketType = 'public' | 'private';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly endpoint: string;
  private readonly publicBucket: string;
  private readonly privateBucket: string;

  constructor(private readonly config: ConfigService) {
    const rawEndpoint = this.config.getOrThrow<string>('S3_ENDPOINT');
    this.endpoint = rawEndpoint.startsWith('http') ? rawEndpoint : `https://${rawEndpoint}`;

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
    this.publicBucket = this.config.getOrThrow('S3_PUBLIC_BUCKET');
    this.privateBucket = this.config.getOrThrow('S3_PRIVATE_BUCKET');
  }

  private getBucket(type: BucketType): string {
    return type === 'public' ? this.publicBucket : this.privateBucket;
  }

  async upload(key: string, buffer: Buffer, contentType: string, bucket: BucketType = 'private'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(bucket),
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
      new GetObjectCommand({ Bucket: this.privateBucket, Key: key }),
      { expiresIn },
    );
  }

  getPublicUrl(key: string): string {
    return `${this.endpoint}/${this.publicBucket}/${key}`;
  }
}
