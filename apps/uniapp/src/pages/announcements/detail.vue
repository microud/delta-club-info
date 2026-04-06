<template>
  <view class="page">
    <view v-if="announcement" class="content">
      <view class="card">
        <view class="title">{{ announcement.title }}</view>
        <view class="date">{{ formatDate(announcement.publishedAt) }}</view>
        <view class="club-name" v-if="announcement.clubName">
          {{ announcement.clubName }}
        </view>
      </view>
      <view class="card body">
        <text class="body-text" user-select>{{ announcement.content }}</text>
      </view>
    </view>
    <view v-else-if="loading" class="loading-hint">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  clubId?: string;
  clubName?: string;
}

const announcement = ref<Announcement | null>(null);
const loading = ref(true);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

onLoad(async (options) => {
  const id = options?.id;
  if (!id) return;
  try {
    announcement.value = await request<Announcement>({
      url: `/api/client/announcements/${id}`,
    });
    if (announcement.value?.title) {
      uni.setNavigationBarTitle({ title: announcement.value.title });
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.card {
  background: #fff;
  padding: 32rpx 24rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111;
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.date {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.club-name {
  font-size: 24rpx;
  color: #3b82f6;
}

.body {
  line-height: 1;
}

.body-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

.loading-hint {
  text-align: center;
  padding: 80rpx 0;
  font-size: 28rpx;
  color: #999;
}
</style>
