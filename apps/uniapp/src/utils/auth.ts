import { request } from './request';

export async function silentLogin(): Promise<string> {
  const existingToken = uni.getStorageSync('token');
  if (existingToken) return existingToken;

  const { code } = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({ success: resolve, fail: reject });
  });

  const { accessToken } = await request<{ accessToken: string }>({
    url: '/api/client/auth/login',
    method: 'POST',
    data: { code },
    needAuth: false,
  });

  uni.setStorageSync('token', accessToken);
  return accessToken;
}

export async function getUserProfile(): Promise<void> {
  const { userInfo } = await new Promise<UniApp.GetUserProfileRes>(
    (resolve, reject) => {
      uni.getUserProfile({
        desc: '用于展示头像和昵称',
        success: resolve,
        fail: reject,
      });
    },
  );

  await request({
    url: '/api/client/auth/profile',
    method: 'POST',
    data: { nickname: userInfo.nickName, avatar: userInfo.avatarUrl },
    needAuth: true,
  });
}
