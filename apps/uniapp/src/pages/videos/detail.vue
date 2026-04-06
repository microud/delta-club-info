<template>
  <view class="page">
    <view v-if="video" class="content">
      <!-- Cover -->
      <image
        v-if="video.coverUrl"
        class="cover"
        :src="video.coverUrl"
        mode="aspectFill"
      />

      <!-- Title & Meta -->
      <view class="card">
        <view class="title">{{ video.title }}</view>
        <view class="meta">
          <text class="tag" :class="getCategoryClass(video.category)">
            {{ getCategoryLabel(video.category) }}
          </text>
          <text class="author">{{ video.authorName }}</text>
          <text class="platform">{{ video.platform }}</text>
        </view>
      </view>

      <!-- AI Summary -->
      <view v-if="video.aiSummary" class="card ai-section">
        <view class="section-title">AI 摘要</view>
        <view class="ai-content">{{ video.aiSummary }}</view>
      </view>

      <!-- Description -->
      <view v-if="video.description" class="card">
        <view class="section-title">视频简介</view>
        <view class="description">{{ video.description }}</view>
      </view>

      <!-- Related Club -->
      <view v-if="video.clubName" class="card club-link" @click="goClub">
        <text class="club-label">所属俱乐部</text>
        <text class="club-name">{{ video.clubName }}</text>
        <text class="arrow">›</text>
      </view>

      <!-- Watch Button -->
      <view v-if="video.videoUrl" class="watch-btn" @click="copyLink">
        在 {{ video.platform || 'B站' }} 观看
      </view>
    </view>

    <view v-else-if="loading" class="loading-hint">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface VideoDetail {
  id: string;
  title: string;
  coverUrl?: string;
  authorName: string;
  platform?: string;
  category?: string;
  description?: string;
  aiSummary?: string;
  videoUrl?: string;
  clubId?: string;
  clubName?: string;
}

const video = ref<VideoDetail | null>(null);
const loading = ref(true);

function getCategoryLabel(category?: string) {
  if (category === 'REVIEW') return '评测';
  if (category === 'SENTIMENT') return '舆情';
  return category || '';
}

function getCategoryClass(category?: string) {
  if (category === 'REVIEW') return 'tag-review';
  if (category === 'SENTIMENT') return 'tag-sentiment';
  return '';
}

function goClub() {
  if (video.value?.clubId) {
    uni.navigateTo({ url: `/pages/clubs/detail?id=${video.value.clubId}` });
  }
}

function copyLink() {
  if (!video.value?.videoUrl) return;
  uni.setClipboardData({
    data: video.value.videoUrl,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' });
    },
  });
}

onLoad(async (options) => {
  const id = options?.id;
  if (!id) return;
  try {
    video.value = await request<VideoDetail>({ url: `/api/client/videos/${id}` });
    if (video.value?.title) {
      uni.setNavigationBarTitle({ title: video.value.title });
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

.cover {
  width: 750rpx;
  height: 420rpx;
  background: #222;
}

.card {
  background: #fff;
  padding: 24rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.tag-review {
  background: #dbeafe;
  color: #3b82f6;
}

.tag-sentiment {
  background: #fef3c7;
  color: #d97706;
}

.author {
  font-size: 26rpx;
  color: #555;
}

.platform {
  font-size: 24rpx;
  color: #999;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 16rpx;
}

.ai-section {
  border-left: 6rpx solid #3b82f6;
}

.ai-content {
  font-size: 26rpx;
  color: #444;
  line-height: 1.8;
}

.description {
  font-size: 26rpx;
  color: #555;
  line-height: 1.8;
}

.club-link {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.club-label {
  font-size: 26rpx;
  color: #999;
}

.club-name {
  flex: 1;
  font-size: 28rpx;
  color: #3b82f6;
}

.arrow {
  font-size: 36rpx;
  color: #bbb;
}

.watch-btn {
  margin: 0 24rpx;
  padding: 28rpx;
  background: #3b82f6;
  color: #fff;
  border-radius: 16rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
}

.loading-hint {
  text-align: center;
  padding: 80rpx 0;
  font-size: 28rpx;
  color: #999;
}
</style>
