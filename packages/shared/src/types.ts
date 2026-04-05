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
