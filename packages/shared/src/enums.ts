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

export enum CrawlTaskType {
  BLOGGER = 'BLOGGER',
  KEYWORD = 'KEYWORD',
}

export enum CrawlTaskStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
