const BASE_URL = 'http://122.51.235.145/api';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export const request = <T = any>(options: RequestOptions): Promise<ApiResponse<T>> => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    const header: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.header,
    };

    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res: any) => {
        const data = res.data as ApiResponse<T>;
        if (data.code === 200) {
          resolve(data);
        } else if (data.code === 401) {
          uni.removeStorageSync('token');
          uni.showToast({ title: '请重新登录', icon: 'none' });
          reject(data);
        } else {
          uni.showToast({ title: data.msg || '请求失败', icon: 'none' });
          reject(data);
        }
      },
      fail: (err: any) => {
        uni.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      },
    });
  });
};

export const get = <T = any>(url: string, data?: any) =>
  request<T>({ url, method: 'GET', data });

export const post = <T = any>(url: string, data?: any) =>
  request<T>({ url, method: 'POST', data });

export const put = <T = any>(url: string, data?: any) =>
  request<T>({ url, method: 'PUT', data });

export const del = <T = any>(url: string, data?: any) =>
  request<T>({ url, method: 'DELETE', data });
