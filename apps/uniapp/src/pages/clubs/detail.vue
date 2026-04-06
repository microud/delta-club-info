<template>
  <view class="page">
    <!-- Header -->
    <view class="club-header">
      <image
        class="club-logo"
        :src="club?.logoUrl || '/static/logo.png'"
        mode="aspectFill"
      />
      <view class="club-header-info">
        <view class="club-name">{{ club?.name }}</view>
        <view class="club-days">已运营 {{ club?.operatingDays || 0 }} 天</view>
        <view v-if="club?.wechatOfficialAccount" class="club-wechat">
          公众号：{{ club.wechatOfficialAccount }}
        </view>
        <view v-if="club?.predecessorName" class="club-predecessor" @click="goPredecessor">
          前身：<text class="link">{{ club.predecessorName }}</text>
        </view>
      </view>
      <view class="fav-btn" @click="toggleFavorite">
        <text class="fav-icon" :class="{ 'fav-active': isFavorited }">
          {{ isFavorited ? '❤' : '♡' }}
        </text>
      </view>
    </view>

    <view v-if="club?.description" class="club-desc">{{ club.description }}</view>

    <!-- Tabs -->
    <view class="tab-bar">
      <view
        v-for="(tab, idx) in tabs"
        :key="idx"
        class="tab-item"
        :class="{ 'tab-active': activeTab === idx }"
        @click="switchTab(idx)"
      >
        {{ tab }}
      </view>
    </view>

    <!-- Tab Content -->
    <view class="tab-content">
      <!-- Tab 0: 服务价格 -->
      <view v-if="activeTab === 0">
        <!-- Service type sub-tabs -->
        <scroll-view class="sub-tab-scroll" scroll-x>
          <view class="sub-tabs">
            <view
              v-for="st in availableServiceTypes"
              :key="st.value"
              class="sub-tab"
              :class="{ 'sub-tab-active': activeServiceType === st.value }"
              @click="activeServiceType = st.value"
            >
              {{ st.label }}
            </view>
          </view>
        </scroll-view>

        <!-- Service items -->
        <view class="service-items">
          <view
            v-for="item in filteredServices"
            :key="item.id"
            class="service-item"
          >
            <!-- KNIFE_RUN / ESCORT_TRIAL / ESCORT_STANDARD -->
            <template v-if="['KNIFE_RUN', 'ESCORT_TRIAL', 'ESCORT_STANDARD'].includes(item.serviceType)">
              <view class="service-name">{{ item.name }}</view>
              <view class="service-price">
                <text class="price-yuan">¥{{ item.priceYuan }}</text>
                <text class="price-arrow">→</text>
                <text class="price-coin">{{ item.priceHafuCoinW }}哈夫币</text>
              </view>
            </template>

            <!-- ACCOMPANY -->
            <template v-else-if="item.serviceType === 'ACCOMPANY'">
              <view class="service-name">{{ item.name }}</view>
              <view class="service-row">
                <text class="service-tier">{{ item.tier }}</text>
                <text class="price-yuan">¥{{ item.pricePerHour }}/小时</text>
              </view>
            </template>

            <!-- ESCORT_FUN -->
            <template v-else-if="item.serviceType === 'ESCORT_FUN'">
              <view class="service-name">{{ item.gameName }}</view>
              <view class="service-price">
                <text class="price-yuan">¥{{ item.priceYuan }}</text>
                <text class="price-arrow">保底</text>
                <text class="price-coin">{{ item.guaranteeHafuCoinW }}哈夫币</text>
              </view>
            </template>
          </view>
        </view>

        <!-- Rules button -->
        <view v-if="rules.length > 0" class="rules-btn" @click="showRulesModal = true">
          查看规则
        </view>

        <!-- Order Posters -->
        <view v-if="club?.orderPosters && club.orderPosters.length > 0" class="posters-section">
          <view class="section-title">订单截图</view>
          <scroll-view class="posters-scroll" scroll-x>
            <view class="posters-row">
              <image
                v-for="(url, idx) in club.orderPosters"
                :key="idx"
                class="poster-img"
                :src="url"
                mode="aspectFill"
                @click="previewPoster(club!.orderPosters!, idx)"
              />
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- Tab 1: 评论 -->
      <view v-else-if="activeTab === 1" class="coming-soon">
        <text>评论功能即将开放</text>
      </view>

      <!-- Tab 2: 评测视频 -->
      <view v-else-if="activeTab === 2">
        <view v-if="reviewVideos.length === 0" class="coming-soon">
          <text>暂无评测视频</text>
        </view>
        <view v-else class="video-list">
          <view
            v-for="v in reviewVideos"
            :key="v.id"
            class="video-card"
            @click="goVideoDetail(v.id)"
          >
            <image class="video-cover" :src="v.coverUrl" mode="aspectFill" />
            <view class="video-info">
              <view class="video-title">{{ v.title }}</view>
              <view class="video-author">{{ v.authorName }}</view>
            </view>
          </view>
        </view>
      </view>

      <!-- Tab 3: 舆情视频 -->
      <view v-else-if="activeTab === 3">
        <view v-if="sentimentVideos.length === 0" class="coming-soon">
          <text>暂无舆情视频</text>
        </view>
        <view v-else class="video-list">
          <view
            v-for="v in sentimentVideos"
            :key="v.id"
            class="video-card"
            @click="goVideoDetail(v.id)"
          >
            <image class="video-cover" :src="v.coverUrl" mode="aspectFill" />
            <view class="video-info">
              <view class="video-title">{{ v.title }}</view>
              <view class="video-author">{{ v.authorName }}</view>
            </view>
          </view>
        </view>
      </view>

      <!-- Tab 4: 工商信息 -->
      <view v-else-if="activeTab === 4" class="company-grid">
        <view v-if="club?.companyInfo" class="company-item">
          <text class="company-label">公司名称</text>
          <text class="company-value">{{ club.companyInfo.name || '—' }}</text>
        </view>
        <view v-if="club?.companyInfo" class="company-item">
          <text class="company-label">法定代表人</text>
          <text class="company-value">{{ club.companyInfo.legalRep || '—' }}</text>
        </view>
        <view v-if="club?.companyInfo" class="company-item">
          <text class="company-label">注册资本</text>
          <text class="company-value">{{ club.companyInfo.registeredCapital || '—' }}</text>
        </view>
        <view v-if="club?.companyInfo" class="company-item">
          <text class="company-label">成立日期</text>
          <text class="company-value">{{ club.companyInfo.establishDate || '—' }}</text>
        </view>
        <view v-if="club?.companyInfo" class="company-item">
          <text class="company-label">营业执照</text>
          <text class="company-value">{{ club.companyInfo.businessLicense || '—' }}</text>
        </view>
        <view v-if="!club?.companyInfo" class="coming-soon">
          <text>暂无工商信息</text>
        </view>
      </view>
    </view>

    <!-- Rules Modal -->
    <view v-if="showRulesModal" class="modal-overlay" @click.self="showRulesModal = false">
      <view class="modal-sheet">
        <view class="modal-header">
          <text class="modal-title">服务规则</text>
          <text class="modal-close" @click="showRulesModal = false">✕</text>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view
            v-for="rule in rules"
            :key="rule.id"
            class="rule-item"
            :class="getRuleClass(rule.sentiment)"
          >
            <text class="rule-dot">•</text>
            <text class="rule-text">{{ rule.content }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { useUserStore } from '../../stores/user';
import { getUserProfile, silentLogin } from '../../utils/auth';

interface CompanyInfo {
  name?: string;
  legalRep?: string;
  registeredCapital?: string;
  establishDate?: string;
  businessLicense?: string;
}

interface Club {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  operatingDays: number;
  wechatOfficialAccount?: string;
  predecessorId?: string;
  predecessorName?: string;
  serviceTypes: string[];
  orderPosters?: string[];
  companyInfo?: CompanyInfo;
}

interface ServiceItem {
  id: string;
  serviceType: string;
  name?: string;
  priceYuan?: number;
  priceHafuCoinW?: number;
  tier?: string;
  pricePerHour?: number;
  gameName?: string;
  guaranteeHafuCoinW?: number;
}

interface Rule {
  id: string;
  content: string;
  sentiment: 'favorable' | 'unfavorable' | 'neutral';
}

interface Video {
  id: string;
  title: string;
  coverUrl: string;
  authorName: string;
}

const userStore = useUserStore();

const clubId = ref('');
const club = ref<Club | null>(null);
const services = ref<ServiceItem[]>([]);
const rules = ref<Rule[]>([]);
const reviewVideos = ref<Video[]>([]);
const sentimentVideos = ref<Video[]>([]);
const isFavorited = ref(false);
const showRulesModal = ref(false);

const tabs = ['服务价格', '评论', '评测视频', '舆情视频', '工商信息'];
const activeTab = ref(0);

const serviceTypeOptions = [
  { value: 'KNIFE_RUN', label: '跑刀' },
  { value: 'ACCOMPANY', label: '陪玩' },
  { value: 'ESCORT_TRIAL', label: '护航体验' },
  { value: 'ESCORT_STANDARD', label: '护航标准' },
  { value: 'ESCORT_FUN', label: '护航趣味' },
];

const availableServiceTypes = computed(() => {
  if (!club.value) return [];
  return serviceTypeOptions.filter(st =>
    services.value.some(s => s.serviceType === st.value)
  );
});

const activeServiceType = ref('');

const filteredServices = computed(() => {
  if (!activeServiceType.value) return services.value;
  return services.value.filter(s => s.serviceType === activeServiceType.value);
});

function switchTab(idx: number) {
  activeTab.value = idx;
}

function getRuleClass(sentiment: string) {
  if (sentiment === 'favorable') return 'rule-favorable';
  if (sentiment === 'unfavorable') return 'rule-unfavorable';
  return 'rule-neutral';
}

function goPredecessor() {
  if (club.value?.predecessorId) {
    uni.navigateTo({ url: `/pages/clubs/detail?id=${club.value.predecessorId}` });
  }
}

function goVideoDetail(id: string) {
  uni.navigateTo({ url: `/pages/videos/detail?id=${id}` });
}

function previewPoster(urls: string[], current: number) {
  uni.previewImage({ urls, current: String(current) });
}

async function checkFavorite() {
  const token = uni.getStorageSync('token');
  if (!token) return;
  try {
    const res = await request<{ data: Array<{ clubId: string }>; total: number }>({
      url: '/api/client/user/favorites?pageSize=999',
      needAuth: true,
    });
    isFavorited.value = res.data.some(f => f.clubId === clubId.value);
  } catch {
    // not logged in
  }
}

async function toggleFavorite() {
  // Ensure auth
  const token = uni.getStorageSync('token');
  if (!token) {
    try {
      await silentLogin();
    } catch {
      uni.showToast({ title: '登录失败', icon: 'none' });
      return;
    }
  }

  if (!userStore.isAuthorized) {
    try {
      await getUserProfile();
      await userStore.fetchProfile();
    } catch {
      // user cancelled
      return;
    }
  }

  try {
    if (isFavorited.value) {
      await request({
        url: `/api/client/user/favorites/${clubId.value}`,
        method: 'DELETE',
        needAuth: true,
      });
      isFavorited.value = false;
      uni.showToast({ title: '已取消收藏', icon: 'success' });
    } else {
      await request({
        url: `/api/client/user/favorites/${clubId.value}`,
        method: 'POST',
        needAuth: true,
      });
      isFavorited.value = true;
      uni.showToast({ title: '已收藏', icon: 'success' });
    }
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
}

onLoad(async (options) => {
  clubId.value = options?.id || '';
  if (!clubId.value) return;

  const [clubRes, servicesRes, rulesRes, reviewRes, sentimentRes] = await Promise.allSettled([
    request<Club>({ url: `/api/client/clubs/${clubId.value}` }),
    request<ServiceItem[]>({ url: `/api/client/clubs/${clubId.value}/services` }),
    request<Rule[]>({ url: `/api/client/clubs/${clubId.value}/rules` }),
    request<Video[]>({ url: `/api/client/clubs/${clubId.value}/videos?type=REVIEW` }),
    request<Video[]>({ url: `/api/client/clubs/${clubId.value}/videos?type=SENTIMENT` }),
  ]);

  if (clubRes.status === 'fulfilled') {
    club.value = clubRes.value;
    uni.setNavigationBarTitle({ title: clubRes.value.name });
  }
  if (servicesRes.status === 'fulfilled') {
    services.value = servicesRes.value;
    if (servicesRes.value.length > 0) {
      activeServiceType.value = servicesRes.value[0].serviceType;
    }
  }
  if (rulesRes.status === 'fulfilled') {
    rules.value = rulesRes.value;
  }
  if (reviewRes.status === 'fulfilled') {
    reviewVideos.value = reviewRes.value;
  }
  if (sentimentRes.status === 'fulfilled') {
    sentimentVideos.value = sentimentRes.value;
  }

  await checkFavorite();
});
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.club-header {
  background: #fff;
  padding: 32rpx 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.club-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.club-header-info {
  flex: 1;
  min-width: 0;
}

.club-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #111;
  margin-bottom: 6rpx;
}

.club-days {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.club-wechat {
  font-size: 24rpx;
  color: #555;
  margin-bottom: 4rpx;
}

.club-predecessor {
  font-size: 24rpx;
  color: #555;
}

.link {
  color: #3b82f6;
}

.fav-btn {
  flex-shrink: 0;
  padding: 8rpx;
}

.fav-icon {
  font-size: 48rpx;
  color: #ccc;
}

.fav-active {
  color: #ef4444;
}

.club-desc {
  background: #fff;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  border-top: 1rpx solid #f0f0f0;
}

.tab-bar {
  background: #fff;
  display: flex;
  margin-top: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #666;
  position: relative;
}

.tab-active {
  color: #3b82f6;
  font-weight: 600;
}

.tab-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 4rpx;
  background: #3b82f6;
  border-radius: 2rpx;
}

.tab-content {
  margin-top: 16rpx;
}

.sub-tab-scroll {
  background: #fff;
}

.sub-tabs {
  display: flex;
  flex-direction: row;
  padding: 16rpx;
  white-space: nowrap;
}

.sub-tab {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 28rpx;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 24rpx;
  color: #555;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.sub-tab-active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.service-items {
  padding: 16rpx;
}

.service-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
}

.service-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 8rpx;
}

.service-price {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.service-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.price-yuan {
  font-size: 30rpx;
  color: #ef4444;
  font-weight: 600;
}

.price-arrow {
  font-size: 24rpx;
  color: #999;
}

.price-coin {
  font-size: 28rpx;
  color: #16a34a;
}

.service-tier {
  font-size: 24rpx;
  color: #999;
  background: #f5f5f5;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.rules-btn {
  margin: 16rpx 24rpx;
  text-align: center;
  padding: 20rpx;
  background: #3b82f6;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.posters-section {
  background: #fff;
  padding: 16rpx 24rpx;
  margin-top: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 16rpx;
}

.posters-scroll {
  width: 100%;
}

.posters-row {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  white-space: nowrap;
}

.poster-img {
  width: 240rpx;
  height: 320rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.coming-soon {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;
  font-size: 28rpx;
  color: #bbb;
}

.video-list {
  padding: 16rpx;
}

.video-card {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  align-items: center;
}

.video-cover {
  width: 160rpx;
  height: 100rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.video-info {
  flex: 1;
  min-width: 0;
}

.video-title {
  font-size: 28rpx;
  color: #222;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.video-author {
  font-size: 24rpx;
  color: #999;
}

.company-grid {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.company-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.company-label {
  font-size: 26rpx;
  color: #999;
  width: 180rpx;
  flex-shrink: 0;
}

.company-value {
  font-size: 26rpx;
  color: #222;
  flex: 1;
}

/* Rules Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-sheet {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  width: 100%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #111;
}

.modal-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.modal-body {
  flex: 1;
  padding: 24rpx 32rpx;
  overflow: hidden;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f9f9f9;
}

.rule-dot {
  font-size: 28rpx;
  margin-top: 2rpx;
}

.rule-text {
  font-size: 26rpx;
  line-height: 1.6;
  flex: 1;
}

.rule-favorable .rule-dot,
.rule-favorable .rule-text {
  color: #16a34a;
}

.rule-unfavorable .rule-dot,
.rule-unfavorable .rule-text {
  color: #ef4444;
}

.rule-neutral .rule-dot,
.rule-neutral .rule-text {
  color: #666;
}
</style>
