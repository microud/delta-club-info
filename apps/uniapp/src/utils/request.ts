const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  needAuth?: boolean;
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('token');
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && options.needAuth !== false) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          uni.removeStorageSync('token');
          reject(new Error('Unauthorized'));
        } else {
          reject(new Error(`Request failed: ${res.statusCode}`));
        }
      },
      fail: (err) => reject(err),
    });
  });
}
