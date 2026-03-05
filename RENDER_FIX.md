# Render 后端部署诊断与修复指南

## 🔍 当前问题

### 问题 1：API 路由 404
```bash
curl https://skills-market-render-backend.onrender.com/api/orders
# 返回：{"error":"Not found","path":"/api/orders"}
```

**原因：** Render 可能没有正确启动 Express 服务器

### 问题 2：数据库连接错误
```bash
curl https://skills-market-render-backend.onrender.com/api/skills
# 返回：Error validating datasource `db`: URL must start with protocol `file:`
```

**原因：** Render 上缺少 `DATABASE_URL` 环境变量

---

## ✅ 修复步骤

### 步骤 1：在 Render Dashboard 配置环境变量

1. 访问：https://dashboard.render.com
2. 找到 `skills-market-render-backend` 服务
3. 进入 **Environment** 标签页
4. 添加以下环境变量：

```
DATABASE_URL=postgresql://postgres.corodwkrpyyrclxywwqa:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**注意：**
- 把 `YOUR_PASSWORD` 替换为实际的 Supabase 数据库密码
- 密码位置：Supabase Dashboard > Project Settings > Database > Connection String

### 步骤 2：更新 Render Build & Start 配置

在 Render Dashboard 的 **Settings** 标签页：

1. **Build Command：**
```
npm install && npx prisma generate
```

2. **Start Command：**
```
node server.js
```

### 步骤 3：手动触发重新部署

1. 在 Render Dashboard 找到 `skills-market-render-backend` 服务
2. 点击 **Manual Deploy** 按钮
3. 选择最新的 commit
4. 等待部署完成（3-5 分钟）

### 步骤 4：验证修复

部署完成后，测试以下端点：

```bash
# 1. 健康检查
curl https://skills-market-render-backend.onrender.com/health
# 预期返回：{"status":"ok","timestamp":"...","version":"1.0.0"}

# 2. 技能列表（不需要认证）
curl https://skills-market-render-backend.onrender.com/api/skills
# 预期返回：{"skills":[],"pagination":{...}}

# 3. 订单列表（需要认证 token）
curl -H "Authorization: Bearer YOUR_TOKEN" https://skills-market-render-backend.onrender.com/api/orders
# 预期返回：订单列表或认证错误
```

---

## 📋 修复检查清单

完成以下步骤后打钩：

- [ ] 在 Render 添加 `DATABASE_URL` 环境变量
- [ ] 更新 Build Command 为：`npm install && npx prisma generate`
- [ ] 更新 Start Command 为：`node server.js`
- [ ] 手动触发重新部署
- [ ] 部署完成后测试 `/health` 返回 200
- [ ] 部署完成后测试 `/api/skills` 返回 200（不带 token）
- [ ] 部署完成后测试 `/api/orders` 返回 200（带 token）或 401（不带 token）

---

## 🔧 如果问题仍然存在

### 检查 1：查看 Render 日志

1. 在 Render Dashboard 找到 `skills-market-render-backend` 服务
2. 点击 **Logs** 标签页
3. 查看是否有错误信息

### 检查 2：查看 GitHub 提交历史

```bash
cd ai-business/project/skills-market-backend
git log --oneline -5
```

确保最新的 commit 包含：
- `2256f1c` - 更新 Prisma schema 到 PostgreSQL
- `91688d7` - 重写 server.js 直接实现 API 路由
- `98f98af` - 添加 Express 服务器适配 Render 部署

### 检查 3：本地测试

```bash
cd ai-business/project/skills-market-backend

# 设置环境变量
export DATABASE_URL="postgresql://..."

# 生成 Prisma Client
npx prisma generate

# 启动服务器
npm start

# 测试 API
curl http://localhost:3000/health
curl http://localhost:3000/api/skills
```

---

## 📞 需要帮助？

如果按照上述步骤仍然无法解决问题，请提供：

1. Render Dashboard 中的服务配置截图
2. Render Logs 中的错误信息
3. GitHub 仓库的 commit 历史

---

**最后更新：** 2026-03-05 15:35
**更新人：** Dev-Max
**状态：** 等待 Cathy 在 Render Dashboard 配置环境变量
