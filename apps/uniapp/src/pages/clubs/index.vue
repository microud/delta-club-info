<template>
  <view class="page">
    <!-- Search Bar -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索俱乐部"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <text v-if="keyword" class="search-clear" @click="clearSearch">✕</text>
      </view>
      <view class="filter-btn" @click="openFilter">
        <text class="filter-icon">⚙</text>
        <view v-if="hasActiveFilters" class="filter-badge" />
      </view>
    </view>

    <!-- Club List -->
    <view class="club-list">
      <view
        v-for="club in clubs"
        :key="club.id"
        class="club-card"
        @click="goDetail(club.id)"
      >
        <image
          class="club-logo"
          :src="club.logo || '/static/logo.png'"
          mode="aspectFill"
        />
        <view class="club-info">
          <view class="club-name">{{ club.name }}</view>
          <view class="club-days">已运营 {{ getOperatingDays(club.establishedAt) }} 天</view>
          <view class="club-tags">
            <text
              v-for="type in club.serviceTypes"
              :key="type"
              class="service-tag"
            >
              {{ getTypeLabel(type) }}
            </text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-hint">加载中...</view>
      <view v-else-if="noMore && clubs.length > 0" class="loading-hint">没有更多了</view>
      <view v-else-if="clubs.length === 0 && !loading" class="empty-hint">
        <text>暂无俱乐部</text>
      </view>
    </view>

    <!-- Filter Bottom Sheet -->
    <view v-if="showFilter" class="filter-mask" @click="showFilter = false" />
    <view class="filter-sheet" :class="{ 'filter-sheet-show': showFilter }">
      <view class="filter-header">
        <text class="filter-title">筛选</text>
        <text class="filter-close" @click="showFilter = false">✕</text>
      </view>

      <!-- Service Types -->
      <view class="filter-section">
        <text class="filter-label">玩法类型</text>
        <view class="filter-chips">
          <view
            v-for="item in serviceTypeOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip-active': tempSelectedTypes.includes(item.value) }"
            @click="toggleTempType(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- Sort -->
      <view class="filter-section">
        <text class="filter-label">排序方式</text>
        <view class="filter-chips">
          <view
            v-for="item in sortOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip-active': tempSortBy === item.value }"
            @click="tempSortBy = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- Operating Duration -->
      <view class="filter-section">
        <text class="filter-label">运营时长</text>
        <view class="filter-chips">
          <view
            v-for="item in durationOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip-active': tempMinDays === item.value }"
            @click="tempMinDays = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- Has Company Info -->
      <view class="filter-section filter-section-row">
        <text class="filter-label">有工商信息</text>
        <switch :checked="tempHasCompanyInfo" @change="tempHasCompanyInfo = ($event as any).detail.value" />
      </view>

      <!-- Actions -->
      <view class="filter-actions">
        <view class="filter-action-reset" @click="resetTempFilters">重置</view>
        <view class="filter-action-confirm" @click="applyFilters">确认</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface Club {
  id: string;
  name: string;
  logo?: string;
  establishedAt?: string;
  serviceTypes: string[];
}

const serviceTypeOptions = [
  { value: 'KNIFE_RUN', label: '跑刀' },
  { value: 'ACCOMPANY', label: '陪玩' },
  { value: 'ESCORT_TRIAL', label: '护航体验' },
  { value: 'ESCORT_STANDARD', label: '护航标准' },
  { value: 'ESCORT_FUN', label: '护航趣味' },
];

const sortOptions = [
  { value: 'createdAt', label: '最新入驻' },
  { value: 'operatingDays', label: '运营最久' },
];

const durationOptions = [
  { value: 0, label: '不限' },
  { value: 180, label: '半年以上' },
  { value: 365, label: '1年以上' },
  { value: 730, label: '2年以上' },
];

const keyword = ref('');
const selectedTypes = ref<string[]>([]);
const sortBy = ref('createdAt');
const minDays = ref(0);
const hasCompanyInfo = ref(false);

const showFilter = ref(false);
const tempSelectedTypes = ref<string[]>([]);
const tempSortBy = ref('createdAt');
const tempMinDays = ref(0);
const tempHasCompanyInfo = ref(false);

const clubs = ref<Club[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const noMore = ref(false);

const hasActiveFilters = computed(() => {
  return selectedTypes.value.length > 0
    || sortBy.value !== 'createdAt'
    || minDays.value > 0
    || hasCompanyInfo.value;
});

function getTypeLabel(type: string) {
  return serviceTypeOptions.find(t => t.value === type)?.label || type;
}

function getOperatingDays(establishedAt?: string) {
  if (!establishedAt) return 0;
  const diff = Date.now() - new Date(establishedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function openFilter() {
  tempSelectedTypes.value = [...selectedTypes.value];
  tempSortBy.value = sortBy.value;
  tempMinDays.value = minDays.value;
  tempHasCompanyInfo.value = hasCompanyInfo.value;
  showFilter.value = true;
}

function toggleTempType(value: string) {
  const idx = tempSelectedTypes.value.indexOf(value);
  if (idx >= 0) {
    tempSelectedTypes.value.splice(idx, 1);
  } else {
    tempSelectedTypes.value.push(value);
  }
}

function resetTempFilters() {
  tempSelectedTypes.value = [];
  tempSortBy.value = 'createdAt';
  tempMinDays.value = 0;
  tempHasCompanyInfo.value = false;
}

function applyFilters() {
  selectedTypes.value = [...tempSelectedTypes.value];
  sortBy.value = tempSortBy.value;
  minDays.value = tempMinDays.value;
  hasCompanyInfo.value = tempHasCompanyInfo.value;
  showFilter.value = false;
  resetAndLoad();
}

function handleSearch() {
  resetAndLoad();
}

function clearSearch() {
  keyword.value = '';
  resetAndLoad();
}

function resetAndLoad() {
  clubs.value = [];
  page.value = 1;
  noMore.value = false;
  fetchClubs();
}

async function fetchClubs() {
  if (loading.value) return;
  if (noMore.value) return;

  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(page.value));
    params.set('pageSize', String(pageSize));
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim());
    if (selectedTypes.value.length > 0) {
      params.set('serviceTypes', selectedTypes.value.join(','));
    }
    if (sortBy.value !== 'createdAt') params.set('sortBy', sortBy.value);
    if (minDays.value > 0) params.set('minOperatingDays', String(minDays.value));
    if (hasCompanyInfo.value) params.set('hasCompanyInfo', 'true');

    const res = await request<{ data: Club[]; total: number }>({
      url: `/api/client/clubs?${params.toString()}`,
    });

    clubs.value = [...clubs.value, ...res.data];
    total.value = res.total;
    page.value += 1;
    noMore.value = clubs.value.length >= res.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${id}` });
}

onLoad(() => {
  fetchClubs();
});

onReachBottom(() => {
  fetchClubs();
});

onPullDownRefresh(async () => {
  clubs.value = [];
  page.value = 1;
  noMore.value = false;
  await fetchClubs();
  uni.stopPullDownRefresh();
});
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.search-bar {
  background: #fff;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 12rpx 24rpx;
  gap: 12rpx;
  flex: 1;
}

.search-icon {
  font-size: 28rpx;
  color: #999;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #222;
  background: transparent;
}

.search-clear {
  font-size: 28rpx;
  color: #bbb;
  padding: 4rpx;
}

.filter-btn {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.filter-icon {
  font-size: 36rpx;
  color: #666;
}

.filter-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ef4444;
}

.club-list {
  padding: 16rpx;
}

.club-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.club-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.club-info {
  flex: 1;
  min-width: 0;
}

.club-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 6rpx;
}

.club-days {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.club-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.service-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #dbeafe;
  color: #3b82f6;
}

.loading-hint {
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 32rpx 0;
}

.empty-hint {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;
  font-size: 28rpx;
  color: #bbb;
}

.filter-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.filter-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 101;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.filter-sheet-show {
  transform: translateY(0);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}

.filter-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.filter-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.filter-section {
  padding: 20rpx 32rpx;
}

.filter-section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}

.filter-section-row .filter-label {
  margin-bottom: 0;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 26rpx;
  color: #555;
  background: #fff;
}

.chip-active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.filter-actions {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;
}

.filter-action-reset {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 28rpx;
  color: #666;
}

.filter-action-confirm {
  flex: 2;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 40rpx;
  background: #3b82f6;
  font-size: 28rpx;
  color: #fff;
}
</style>
