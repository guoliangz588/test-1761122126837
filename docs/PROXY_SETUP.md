# Google API 代理配置指南

本文档介绍如何为项目中的Google Gemini API请求配置代理，特别适用于中国大陆等需要代理访问Google服务的地区。

## 快速开始

### 1. 复制环境变量模板

```bash
cp .env.example .env.local
```

### 2. 配置环境变量

编辑 `.env.local` 文件：

```env
# Google API密钥 (必需)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# 启用代理
PROXY_ENABLED=true

# 代理配置 (根据你的代理软件调整)
PROXY_HOST=127.0.0.1
PROXY_PORT=7890
PROXY_PROTOCOL=http
```

### 3. 测试代理配置

```bash
npm run test:proxy
```

### 4. 启动应用

```bash
npm run dev
```

## 详细配置

### 环境变量说明

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API密钥 | - | `AIzaSy...` |
| `PROXY_ENABLED` | 是否启用代理 | `false` | `true` |
| `PROXY_HOST` | 代理服务器地址 | `127.0.0.1` | `127.0.0.1` |
| `PROXY_PORT` | 代理服务器端口 | `7890` | `7890` |
| `PROXY_PROTOCOL` | 代理协议 | `http` | `http`/`https`/`socks5` |
| `PROXY_TIMEOUT` | 请求超时时间(毫秒) | `30000` | `30000` |
| `PROXY_MAX_REDIRECTS` | 最大重定向次数 | `5` | `5` |
| `NO_PROXY` | 不使用代理的地址 | `localhost,127.0.0.1` | - |

### 常见代理软件配置

#### Clash
```env
PROXY_HOST=127.0.0.1
PROXY_PORT=7890
PROXY_PROTOCOL=http
```

#### V2Ray
```env
PROXY_HOST=127.0.0.1
PROXY_PORT=10809
PROXY_PROTOCOL=http
```

#### Shadowsocks
```env
PROXY_HOST=127.0.0.1
PROXY_PORT=1080
PROXY_PROTOCOL=socks5
```

## 测试和调试

### 运行代理测试

```bash
npm run test:proxy
```

测试脚本会：
1. 检查环境变量配置
2. 初始化代理设置
3. 测试Google API连接
4. 显示详细的状态信息

### 查看代理日志

启动应用时，控制台会显示代理初始化信息：

```
🚀 应用启动初始化...
🔧 初始化Google API代理配置...
✅ Google API代理已启用: http://127.0.0.1:7890
🧪 测试Google API连接...
✅ Google API连接测试成功
📊 可用模型数量: 15
🎉 Google API代理测试通过！
✅ 应用初始化完成
```

### 常见问题排查

#### 1. 连接超时
```
❌ Google API连接测试失败: timeout of 10000ms exceeded
```

**解决方案：**
- 检查代理软件是否正在运行
- 确认代理端口配置正确
- 增加超时时间：`PROXY_TIMEOUT=60000`

#### 2. 连接被拒绝
```
❌ Google API连接测试失败: connect ECONNREFUSED 127.0.0.1:7890
```

**解决方案：**
- 检查代理软件是否启动
- 确认代理端口是否正确
- 检查防火墙设置

#### 3. API密钥错误
```
❌ Google API连接测试失败: 403 Forbidden
```

**解决方案：**
- 检查API密钥是否正确
- 确认API密钥是否已启用Generative AI API
- 检查API配额是否充足

#### 4. 代理认证失败
```
❌ Google API连接测试失败: 407 Proxy Authentication Required
```

**解决方案：**
- 如果代理需要认证，请使用带认证的URL格式：
  ```env
  PROXY_HOST=username:password@127.0.0.1
  ```

## 高级配置

### 自定义代理规则

如果需要更复杂的代理配置，可以修改 `lib/config/google-proxy.ts` 文件。

### 禁用代理

如果不需要代理，设置：
```env
PROXY_ENABLED=false
```

或者删除/注释相关环境变量。

### 生产环境配置

在生产环境中，建议：
1. 使用环境变量而不是 `.env.local` 文件
2. 设置合适的超时时间
3. 监控代理连接状态
4. 配置日志记录

## 支持的API

当前代理配置支持以下Google API：
- Google Generative AI API (Gemini)
- 所有 `googleapis.com` 域名下的API
- 所有 `generativelanguage.googleapis.com` 域名下的API

## 故障排除

如果遇到问题，请按以下步骤排查：

1. **检查基础配置**
   ```bash
   npm run test:proxy
   ```

2. **检查代理软件**
   - 确认代理软件正在运行
   - 测试代理是否可以访问其他网站

3. **检查网络连接**
   ```bash
   curl -x http://127.0.0.1:7890 https://www.google.com
   ```

4. **查看详细日志**
   - 启动应用时查看控制台输出
   - 检查是否有错误信息

5. **联系支持**
   - 如果问题仍然存在，请提供详细的错误信息和配置

## 更新日志

- v1.0.0: 初始版本，支持HTTP/HTTPS/SOCKS5代理
- v1.1.0: 添加自动测试和详细日志
- v1.2.0: 支持代理认证和自定义规则
