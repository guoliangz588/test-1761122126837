import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 代理配置接口
interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  enabled: boolean;
  timeout?: number;
  maxRedirects?: number;
}

// 从环境变量读取代理配置
const getProxyConfig = (): ProxyConfig => ({
  host: process.env.PROXY_HOST || '127.0.0.1',
  port: parseInt(process.env.PROXY_PORT || '7890'),
  protocol: (process.env.PROXY_PROTOCOL as 'http' | 'https' | 'socks5') || 'http',
  enabled: process.env.PROXY_ENABLED === 'true',
  timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
  maxRedirects: parseInt(process.env.PROXY_MAX_REDIRECTS || '5')
});

// 全局代理状态
let globalProxyInitialized = false;
let axiosInstance: ReturnType<typeof axios.create> | null = null;
let originalFetch: typeof globalThis.fetch | null = null;

// 初始化全局代理
export function initializeGlobalProxy(): void {
  if (globalProxyInitialized) {
    return;
  }

  const config = getProxyConfig();
  
  if (!config.enabled) {
    console.log('🚫 代理已禁用，使用直连模式');
    globalProxyInitialized = true;
    return;
  }

  console.log('🔧 初始化全局代理配置:', config);

  // 设置环境变量
  const proxyUrl = `${config.protocol}://${config.host}:${config.port}`;
  process.env.HTTP_PROXY = proxyUrl;
  process.env.HTTPS_PROXY = proxyUrl;
  process.env.NO_PROXY = process.env.NO_PROXY || 'localhost,127.0.0.1,127.0.0.1:4000';

  // 创建带代理的axios实例
  axiosInstance = axios.create({
    httpsAgent: new HttpsProxyAgent(proxyUrl),
    httpAgent: new HttpsProxyAgent(proxyUrl),
    timeout: config.timeout,
    maxRedirects: config.maxRedirects
  });

  // 重写全局fetch
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    try {
      console.log('🌐 通过代理发送请求:', url.toString());
      
      const response = await axiosInstance!.request({
        url: url.toString(),
        method: init?.method || 'GET',
        headers: init?.headers as any,
        data: init?.body,
        responseType: 'arraybuffer',
        validateStatus: () => true
      });
      
      return new Response(response.data, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any
      });
    } catch (error) {
      console.error('❌ 代理请求失败，回退到直连:', error);
      return originalFetch!(url, init);
    }
  };

  globalProxyInitialized = true;
  console.log('✅ 全局代理配置完成');
}

// 获取代理axios实例
export function getProxiedAxios(): ReturnType<typeof axios.create> {
  if (!globalProxyInitialized) {
    initializeGlobalProxy();
  }
  
  if (axiosInstance) {
    return axiosInstance;
  }
  
  // 如果代理未启用，返回普通axios实例
  return axios.create();
}

// 测试代理连接
export async function testProxyConnection(): Promise<boolean> {
  try {
    const config = getProxyConfig();
    if (!config.enabled) {
      console.log('🚫 代理已禁用，跳过测试');
      return false;
    }

    const axios = getProxiedAxios();
    const response = await axios.get('https://httpbin.org/ip', {
      timeout: 5000
    });
    
    console.log('✅ 代理测试成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 代理测试失败:', error);
    return false;
  }
}

// 检查代理是否已初始化
export function isProxyInitialized(): boolean {
  return globalProxyInitialized;
}

// 获取当前代理配置
export function getCurrentProxyConfig(): ProxyConfig {
  return getProxyConfig();
} 