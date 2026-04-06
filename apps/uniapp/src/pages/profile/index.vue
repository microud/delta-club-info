<template>
  <view class="page">
    <!-- User Card -->
    <view class="user-card" @click="handleLogin">
      <image
        class="avatar"
        :src="userStore.profile?.avatar || '/static/logo.png'"
        mode="aspectFill"
      />
      <view class="user-info">
        <view class="nickname">
          {{ userStore.profile?.nickname || '点击登录' }}
        </view>
        <view v-if="!userStore.isAuthorized" class="login-hint">
          登录后享受更多功能
        </view>
      </view>
      <text v-if="!userStore.isAuthorized" class="login-arrow">›</text>
    </view>

    <!-- Menu -->
    <view class="menu-section">
      <view class="menu-item" @click="goFavorites">
        <text class="menu-icon">⭐</text>
        <text class="menu-label">我的收藏</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item menu-disabled">
        <text class="menu-icon">💬</text>
        <text class="menu-label">我的评价</text>
        <text class="menu-badge">即将开放</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '../../stores/user';
import { getUserProfile, silentLogin } from '../../utils/auth';

const userStore = useUserStore();

async function handleLogin() {
  if (userStore.isAuthorized) return;

  try {
    await silentLogin();
  } catch {
    uni.showToast({ title: '登录失败', icon: 'none' });
    return;
  }

  if (!userStore.isAuthorized) {
    try {
      await getUserProfile();
      await userStore.fetchProfile();
    } catch {
      // user cancelled
    }
  }
}

function goFavorites() {
  uni.navigateTo({ url: '/pages/profile/favorites' });
}

onLoad(async () => {
  const token = uni.getStorageSync('token');
  if (token) {
    await userStore.fetchProfile();
  }
});
</script>

<style scoped>
.page {
  background: #f5f5f5;
  min-height: 100vh;
}

.user-card {
  background: #3b82f6;
  padding: 60rpx 32rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.3);
  border: 4rpx solid rgba(255, 255, 255, 0.6);
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4rpx;
}

.login-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}

.login-arrow {
  font-size: 48rpx;
  color: rgba(255, 255, 255, 0.7);
}

.menu-section {
  background: #fff;
  margin: 24rpx 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 16rpx;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 36rpx;
}

.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: #222;
}

.menu-arrow {
  font-size: 36rpx;
  color: #bbb;
}

.menu-badge {
  font-size: 22rpx;
  color: #999;
  background: #f0f0f0;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}

.menu-disabled .menu-label {
  color: #999;
}
</style>
