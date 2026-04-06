<template>
  <view class="page">
    <!-- Banner Swiper -->
    <swiper
      v-if="banners.length > 0"
      class="banner-swiper"
      autoplay
      circular
      indicator-dots
      indicator-color="rgba(255,255,255,0.5)"
      indicator-active-color="#ffffff"
    >
      <swiper-item
        v-for="item in banners"
        :key="item.clubId"
        @click="goClubDetail(item.clubId)"
      >
        <image class="banner-image" :src="item.imageUrl" mode="aspectFill" />
        <view class="banner-label">{{ item.clubName }}</view>
      </swiper-item>
    </swiper>

    <!-- Feed List -->
    <view class="feed-list">
      <view
        v-for="item in feedItems"
        :key="item.id"
        class="feed-card"
        @click="goFeedDetail(item)"
      >
        <!-- Video Card -->
        <template v-if="item.type === 'video'">
          <image
            v-if="item.coverUrl"
            class="feed-cover"
            :src="item.coverUrl"
            mode="aspectFill"
          />
          <view class="feed-content">
            <view class="feed-title">{{ item.title }}</view>
            <view class="feed-meta">
              <text class="feed-tag" :class="getCategoryClass(item.category)">
                {{ getCategoryLabel(item.category) }}
              </text>
              <text class="feed-author">{{ item.authorName }}</text>
            </view>
            <view class="feed-club">{{ item.clubName }}</view>
          </view>
        </template>

        <!-- Announcement Card -->
        <template v-else>
          <view class="feed-content">
            <view class="feed-meta">
              <text class="feed-tag tag-announcement">公告</text>
              <text class="feed-club">{{ item.clubName }}</text>
            </view>
            <view class="feed-title">{{ item.title }}</view>
            <view class="feed-snippet">{{ item.content }}</view>
          </view>
        </template>
      </view>

      <!-- Loading indicator -->
      <view v-if="loading" class="loading-hint">加载中...</view>
      <view v-else-if="noMore" class="loading-hint">没有更多了</view>
      <view v-else-if="feedItems.length === 0 && !loading" class="empty-hint">暂无内容</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface BannerItem {
  clubId: string;
  clubName: string;
  imageUrl: string;
}

interface FeedItem {
  id: string;
  type: 'video' | 'announcement';
  title: string;
  coverUrl?: string;
  authorName?: string;
  platform?: string;
  category?: string;
  clubId: string;
  clubName: string;
  content?: string;
  publishedAt: string;
}

const banners = ref<BannerItem[]>([]);
const feedItems = ref<FeedItem[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const noMore = ref(false);

async function fetchBanners() {
  try {
    const data = await request<BannerItem[]>({ url: '/api/client/home/banners' });
    banners.value = data;
  } catch {
    banners.value = [];
  }
}

async function fetchFeed(reset = false) {
  if (loading.value) return;
  if (!reset && noMore.value) return;

  loading.value = true;
  try {
    const currentPage = reset ? 1 : page.value;
    const res = await request<{ data: FeedItem[]; total: number }>({
      url: `/api/client/home/feed?page=${currentPage}&pageSize=${pageSize}`,
    });

    if (reset) {
      feedItems.value = res.data;
      page.value = 2;
    } else {
      feedItems.value = [...feedItems.value, ...res.data];
      page.value = currentPage + 1;
    }

    total.value = res.total;
    noMore.value = feedItems.value.length >= res.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

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

function goClubDetail(clubId: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${clubId}` });
}

function goFeedDetail(item: FeedItem) {
  if (item.type === 'video') {
    uni.navigateTo({ url: `/pages/videos/detail?id=${item.id}` });
  } else {
    uni.navigateTo({ url: `/pages/announcements/detail?id=${item.id}` });
  }
}

onLoad(async () => {
  await Promise.all([fetchBanners(), fetchFeed(true)]);
});

onReachBottom(async () => {
  await fetchFeed(false);
});

onPullDownRefresh(async () => {
  noMore.value = false;
  await Promise.all([fetchBanners(), fetchFeed(true)]);
  uni.stopPullDownRefresh();
});
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.banner-swiper {
  width: 750rpx;
  height: 340rpx;
  position: relative;
}

.banner-image {
  width: 750rpx;
  height: 340rpx;
}

.banner-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
  color: #fff;
  font-size: 28rpx;
}

.feed-list {
  padding: 16rpx;
}

.feed-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.feed-cover {
  width: 750rpx;
  height: 380rpx;
}

.feed-content {
  padding: 20rpx 24rpx;
}

.feed-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 12rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.feed-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.feed-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.tag-review {
  background: #dbeafe;
  color: #3b82f6;
}

.tag-sentiment {
  background: #fef3c7;
  color: #d97706;
}

.tag-announcement {
  background: #fee2e2;
  color: #ef4444;
}

.feed-author {
  font-size: 24rpx;
  color: #999;
  flex: 1;
}

.feed-club {
  font-size: 24rpx;
  color: #999;
}

.feed-snippet {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-top: 8rpx;
}

.loading-hint {
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 32rpx 0;
}

.empty-hint {
  text-align: center;
  font-size: 28rpx;
  color: #bbb;
  padding: 80rpx 0;
}
</style>
