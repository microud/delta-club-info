export enum ClubStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum ClubServiceType {
  KNIFE_RUN = 'KNIFE_RUN',
  ACCOMPANY = 'ACCOMPANY',
  ESCORT_TRIAL = 'ESCORT_TRIAL',
  ESCORT_STANDARD = 'ESCORT_STANDARD',
  ESCORT_FUN = 'ESCORT_FUN',
}

export enum RuleSentiment {
  FAVORABLE = 'FAVORABLE',
  UNFAVORABLE = 'UNFAVORABLE',
  NEUTRAL = 'NEUTRAL',
}

export enum VideoPlatform {
  BILIBILI = 'BILIBILI',
  DOUYIN = 'DOUYIN',
}

export enum VideoCategory {
  REVIEW = 'REVIEW',
  SENTIMENT = 'SENTIMENT',
}

export enum AiSentiment {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
}

export enum AiModerationStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_MANUAL = 'PENDING_MANUAL',
}

// Deprecated: use CrawlTaskRunStatus instead
export enum CrawlTaskStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum ContentPlatform {
  BILIBILI = 'BILIBILI',
  DOUYIN = 'DOUYIN',
  XIAOHONGSHU = 'XIAOHONGSHU',
  WECHAT_CHANNELS = 'WECHAT_CHANNELS',
  WECHAT_MP = 'WECHAT_MP',
}

export enum ContentType {
  VIDEO = 'VIDEO',
  NOTE = 'NOTE',
  ARTICLE = 'ARTICLE',
}

export enum ContentCategory {
  REVIEW = 'REVIEW',
  SENTIMENT = 'SENTIMENT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum CrawlTaskType {
  BLOGGER_POSTS = 'BLOGGER_POSTS',
  KEYWORD_SEARCH = 'KEYWORD_SEARCH',
  MP_ARTICLES = 'MP_ARTICLES',
}

export enum CrawlTaskRunStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum ParseTaskStatus {
  PENDING = 'pending',
  PARSING = 'parsing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}
