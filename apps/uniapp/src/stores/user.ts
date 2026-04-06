import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request } from '../utils/request';

interface UserProfile {
  id: string;
  nickname: string | null;
  avatar: string | null;
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null);
  const isAuthorized = ref(false);

  async function fetchProfile() {
    try {
      profile.value = await request<UserProfile>({
        url: '/api/client/user/profile',
        needAuth: true,
      });
      isAuthorized.value = !!profile.value?.nickname;
    } catch {
      profile.value = null;
    }
  }

  function clear() {
    profile.value = null;
    isAuthorized.value = false;
    uni.removeStorageSync('token');
  }

  return { profile, isAuthorized, fetchProfile, clear };
});
