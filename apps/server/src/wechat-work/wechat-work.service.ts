import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { StorageService } from '../storage/storage.service';
import { ParseTaskService } from '../ai-parse/parse-task.service';
import { getSignature, decrypt } from '@wecom/crypto';
import { parseStringPromise } from 'xml2js';
import axios from 'axios';

@Injectable()
export class WechatWorkService {
  private readonly logger = new Logger(WechatWorkService.name);
  private pendingGroups = new Map<
    string,
    { taskId: string; timer: NodeJS.Timeout }
  >();

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: SystemConfigsService,
    private readonly storageService: StorageService,
    private readonly parseTaskService: ParseTaskService,
  ) {}

  async verifyCallback(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): Promise<string> {
    const token = await this.configService.getValue('wechat_work.token');
    const encodingAesKey = await this.configService.getValue(
      'wechat_work.encoding_aes_key',
    );
    if (!token || !encodingAesKey) throw new Error('WeChat Work not configured');

    const signature = getSignature(token, timestamp, nonce, echostr);
    if (signature !== msgSignature) throw new Error('Invalid signature');

    const { message } = decrypt(encodingAesKey, echostr);
    return message;
  }

  async handleMessage(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    body: string,
  ): Promise<string> {
    const token = await this.configService.getValue('wechat_work.token');
    const encodingAesKey = await this.configService.getValue(
      'wechat_work.encoding_aes_key',
    );
    const corpId = await this.configService.getValue('wechat_work.corp_id');
    if (!token || !encodingAesKey || !corpId)
      throw new Error('WeChat Work not configured');

    // Parse XML
    const parsed = await parseStringPromise(body, { explicitArray: false });
    const encryptedMsg = parsed.xml.Encrypt;

    // Verify signature
    const signature = getSignature(token, timestamp, nonce, encryptedMsg);
    if (signature !== msgSignature) throw new Error('Invalid signature');

    // Decrypt
    const { message, id } = decrypt(encodingAesKey, encryptedMsg);
    if (id !== corpId) throw new Error('Corp ID mismatch');

    // Parse decrypted XML
    const msgXml = await parseStringPromise(message, { explicitArray: false });
    const msg = msgXml.xml;

    // Store message
    await this.saveMessage(msg);

    return 'success';
  }

  private async saveMessage(msg: Record<string, string>): Promise<void> {
    const msgType = msg.MsgType;
    const fromUser = msg.FromUserName;
    const msgId = msg.MsgId || `${Date.now()}`;

    let mediaUrl: string | null = null;

    // Download and upload image to S3 if it's an image message
    if (msgType === 'image' && msg.PicUrl) {
      try {
        mediaUrl = await this.downloadAndUploadMedia(msg.PicUrl, msgId);
      } catch (e) {
        this.logger.error(`Failed to download media for msg ${msgId}`, e);
      }
    }

    const [wechatMessage] = await this.db
      .insert(schema.wechatMessages)
      .values({
        msgId,
        msgType,
        content: msg.Content || null,
        mediaUrl,
        fromUser,
        rawPayload: msg,
      })
      .returning();

    // Group message into parse task
    await this.groupMessage(wechatMessage.id, fromUser);
  }

  private async downloadAndUploadMedia(
    picUrl: string,
    msgId: string,
  ): Promise<string> {
    const response = await axios.get(picUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const key = `wechat-messages/${msgId}.${ext}`;
    await this.storageService.upload(key, buffer, contentType);
    return key;
  }

  private async groupMessage(
    messageId: string,
    fromUser: string,
  ): Promise<void> {
    const groupKey = fromUser;
    const existing = this.pendingGroups.get(groupKey);

    if (existing) {
      // Append to existing task
      await this.db.insert(schema.parseTaskMessages).values({
        parseTaskId: existing.taskId,
        wechatMessageId: messageId,
      });
      // Reset timer
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => this.triggerParse(groupKey), 30_000);
    } else {
      // Create new task
      const [task] = await this.db
        .insert(schema.parseTasks)
        .values({ status: 'pending' })
        .returning();

      await this.db.insert(schema.parseTaskMessages).values({
        parseTaskId: task.id,
        wechatMessageId: messageId,
      });

      const timer = setTimeout(() => this.triggerParse(groupKey), 30_000);
      this.pendingGroups.set(groupKey, { taskId: task.id, timer });
    }
  }

  private async triggerParse(groupKey: string): Promise<void> {
    const group = this.pendingGroups.get(groupKey);
    if (!group) return;
    this.pendingGroups.delete(groupKey);

    this.logger.log(`Triggering parse for task ${group.taskId}`);
    // 异步触发，不等待结果
    this.parseTaskService.triggerParse(group.taskId).catch((e) => {
      this.logger.error(`Parse failed for task ${group.taskId}`, e);
    });
  }

  async getAccessToken(): Promise<string> {
    const corpId = await this.configService.getValue('wechat_work.corp_id');
    const secret = await this.configService.getValue('wechat_work.secret');
    if (!corpId || !secret) throw new Error('WeChat Work not configured');

    const res = await axios.get(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`,
    );

    if (res.data.errcode !== 0) {
      throw new Error(`Failed to get access token: ${res.data.errmsg}`);
    }

    return res.data.access_token;
  }
}
