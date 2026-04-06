export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClubDto {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  wechatOfficialAccount: string | null;
  wechatMiniProgram: string | null;
  contactInfo: string | null;
  status: string;
  establishedAt: string | null;
  closedAt: string | null;
  predecessorId: string | null;
  closureNote: string | null;
  companyName: string | null;
  creditCode: string | null;
  legalPerson: string | null;
  registeredAddress: string | null;
  businessScope: string | null;
  registeredCapital: string | null;
  companyEstablishedAt: string | null;
  businessStatus: string | null;
  orderPosters: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClubServiceDto {
  id: string;
  clubId: string;
  type: string;
  priceYuan: string | null;
  priceHafuCoin: string | null;
  tier: string | null;
  pricePerHour: string | null;
  gameName: string | null;
  hasGuarantee: boolean | null;
  guaranteeHafuCoin: string | null;
  rules: string | null;
  sortOrder: number;
  images: string[];
}

export interface ClubRuleDto {
  id: string;
  clubId: string;
  content: string;
  sentiment: string;
  aiAnalysis: unknown | null;
}

export interface PromotionOrderDto {
  id: string;
  clubId: string;
  clubName?: string;
  fee: string;
  startAt: string;
  endAt: string;
  dailyRate: string;
  isActive?: boolean;
  createdAt: string;
}

export interface BloggerDto {
  id: string;
  platform: string;
  externalId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CrawlTaskDto {
  id: string;
  type: string;
  targetId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  videoCount: number;
  errorMessage: string | null;
}

export interface VideoDto {
  id: string;
  clubId: string | null;
  clubName?: string | null;
  platform: string;
  externalId: string;
  title: string;
  coverUrl: string;
  videoUrl: string;
  authorName: string;
  category: string;
  aiParsed: boolean;
  aiSentiment: string | null;
  publishedAt: string;
  createdAt: string;
}

export interface AiConfigDto {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string | null;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiConfigDto {
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface UpdateAiConfigDto {
  name?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface SystemConfigDto {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface WechatMessageDto {
  id: string;
  msgId: string;
  msgType: string;
  content: string | null;
  mediaUrl: string | null;
  fromUser: string;
  createdAt: string;
}

export interface ParseTaskDto {
  id: string;
  status: string;
  clubId: string | null;
  parsedResult: ParsedResult | null;
  errorMessage: string | null;
  messages?: WechatMessageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ParsedResult {
  clubName: string;
  services: ParsedService[];
  rules: ParsedRule[];
}

export interface ParsedService {
  name: string;
  tiers: ParsedTier[];
}

export interface ParsedTier {
  price: number;
  guarantee: string;
  note?: string;
}

export interface ParsedRule {
  content: string;
  category: string;
}

// Client-facing types

export interface ClientBannerDto {
  clubId: string;
  clubName: string;
  imageUrl: string;
}

export interface FeedItemDto {
  id: string;
  type: 'video' | 'announcement';
  title: string;
  coverUrl: string | null;
  authorName: string | null;
  platform: string | null;
  category: string | null;
  clubId: string | null;
  clubName: string | null;
  content: string | null;
  publishedAt: string | null;
}

export interface ClientClubListItemDto {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  establishedAt: string | null;
  serviceTypes: string[];
  createdAt: string;
}

export interface ClientClubDetailDto extends ClubDto {
  predecessor: { id: string; name: string } | null;
}

export interface ClientVideoDetailDto {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string;
  videoUrl: string;
  platform: string;
  category: string;
  authorName: string;
  aiSummary: string | null;
  aiSentiment: string | null;
  clubId: string | null;
  clubName: string | null;
  publishedAt: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  content: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileDto {
  id: string;
  nickname: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface UserFavoriteClubDto {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  establishedAt: string | null;
  favoritedAt: string;
}
