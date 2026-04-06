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
    </view>

    <!-- Service Type Filter Chips -->
    <scroll-view class="filter-scroll" scroll-x>
      <view class="filter-chips">
        <view
          v-for="filter in serviceTypes"
          :key="filter.value"
          class="chip"
          :class="{ 'chip-active': selectedTypes.includes(filter.value) }"
          @click="toggleType(filter.value)"
        >
          {{ filter.label }}
        </view>
      </view>
    </scroll-view>

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
          :src="club.logoUrl || '/static/logo.png'"
          mode="aspectFill"
        />
        <view class="club-info">
          <view class="club-name">{{ club.name }}</view>
          <view class="club-days">已运营 {{ club.operatingDays }} 天</view>
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
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface Club {
  id: string;
  name: string;
  logoUrl?: string;
  operatingDays: number;
  serviceTypes: string[];
}

const serviceTypes = [
  { value: 'KNIFE_RUN', label: '跑刀' },
  { value: 'ACCOMPANY', label: '陪玩' },
  { value: 'ESCORT_TRIAL', label: '护航体验' },
  { value: 'ESCORT_STANDARD', label: '护航标准' },
  { value: 'ESCORT_FUN', label: '护航趣味' },
];

const keyword = ref('');
const selectedTypes = ref<string[]>([]);
const clubs = ref<Club[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const noMore = ref(false);

function getTypeLabel(type: string) {
  return serviceTypes.find(t => t.value === type)?.label || type;
}

function toggleType(value: string) {
  const idx = selectedTypes.value.indexOf(value);
  if (idx >= 0) {
    selectedTypes.value.splice(idx, 1);
  } else {
    selectedTypes.value.push(value);
  }
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
      selectedTypes.value.forEach(t => params.append('serviceTypes', t));
    }

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
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 12rpx 24rpx;
  gap: 12rpx;
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

.filter-scroll {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-chips {
  display: flex;
  flex-direction: row;
  padding: 16rpx 16rpx;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 28rpx;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 26rpx;
  color: #555;
  margin-right: 16rpx;
  background: #fff;
  flex-shrink: 0;
}

.chip-active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
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
</style>
