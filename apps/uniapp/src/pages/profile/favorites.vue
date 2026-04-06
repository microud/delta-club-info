<template>
  <view class="page">
    <view class="club-list">
      <view
        v-for="item in favorites"
        :key="item.clubId"
        class="club-card"
        @click="goDetail(item.clubId)"
      >
        <image
          class="club-logo"
          :src="item.logoUrl || '/static/logo.png'"
          mode="aspectFill"
        />
        <view class="club-info">
          <view class="club-name">{{ item.name }}</view>
          <view class="club-days">已运营 {{ item.operatingDays }} 天</view>
        </view>
        <text class="arrow">›</text>
      </view>

      <view v-if="loading" class="loading-hint">加载中...</view>
      <view v-else-if="noMore && favorites.length > 0" class="loading-hint">没有更多了</view>
      <view v-else-if="favorites.length === 0 && !loading" class="empty-hint">
        还没有收藏哦
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onReachBottom } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface FavoriteItem {
  clubId: string;
  name: string;
  logoUrl?: string;
  operatingDays: number;
}

const favorites = ref<FavoriteItem[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const noMore = ref(false);

async function fetchFavorites() {
  if (loading.value || noMore.value) return;

  loading.value = true;
  try {
    const res = await request<{ data: FavoriteItem[]; total: number }>({
      url: `/api/client/user/favorites?page=${page.value}&pageSize=${pageSize}`,
      needAuth: true,
    });

    favorites.value = [...favorites.value, ...res.data];
    total.value = res.total;
    page.value += 1;
    noMore.value = favorites.value.length >= res.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function goDetail(clubId: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${clubId}` });
}

onLoad(() => {
  fetchFavorites();
});

onReachBottom(() => {
  fetchFavorites();
});
</script>

<style scoped>
.page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40rpx;
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
}

.arrow {
  font-size: 36rpx;
  color: #bbb;
  flex-shrink: 0;
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
