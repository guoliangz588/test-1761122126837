# 创建 GitHub 仓库步骤

## 方法 1: 使用 GitHub CLI (推荐)

如果你已安装 GitHub CLI，可以运行以下命令：

```bash
# 登录 GitHub (如果还没登录)
gh auth login

# 创建公开仓库
gh repo create ui-tool-server --public --source=. --remote=origin --push

# 或创建私有仓库
gh repo create ui-tool-server --private --source=. --remote=origin --push
```

## 方法 2: 使用 GitHub 网页

1. 访问 https://github.com/new
2. 填写仓库信息：
   - Repository name: `ui-tool-server`
   - Description: `Dynamic UI component server - Register and serve React components via API`
   - 选择 Public 或 Private
   - **不要** 勾选 "Initialize this repository with a README"
3. 点击 "Create repository"
4. 在本地运行以下命令：

```bash
# 添加远程仓库
git remote add origin https://github.com/[你的用户名]/ui-tool-server.git

# 推送代码
git branch -M main
git push -u origin main
```

## 方法 3: 使用命令行

```bash
# 1. 先在本地重命名分支为 main
git branch -m main

# 2. 创建仓库后，添加远程仓库
git remote add origin git@github.com:[你的用户名]/ui-tool-server.git

# 3. 推送代码
git push -u origin main
```

## 验证

推送成功后，访问 `https://github.com/[你的用户名]/ui-tool-server` 查看你的仓库。

## 后续步骤

1. 在 GitHub 上添加更详细的描述
2. 添加 topics 标签，如: `nextjs`, `react`, `api`, `ui-components`
3. 考虑添加 LICENSE 文件
4. 设置 GitHub Actions 进行自动化测试和部署