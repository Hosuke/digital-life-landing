# Control Plane (UID 下单 + 会话分配)

这个服务负责三件事：
- 官网 `UID` 下单与状态追踪
- Telegram bot 的 UID 绑定与素材回传
- 独立会话分配（轮询策略）

## Quick Start
```bash
cd control-plane
npm install
cp .env.example .env
# 可选：cp data/channel-pool.example.json data/channel-pool.json
npm start
```

默认端口：`8787`

## 主要接口
- `POST /api/apply`：官网创建 UID
- `POST /api/bind`：bot 绑定 `uid <-> tg chat`
- `POST /api/handoff`：素材齐后请求分配独立会话
- `POST /api/allocate-channel`：手动分配（运维）
- `POST /api/release-channel`：释放会话占用
- `GET /api/session/:uid/status`：查询状态
- `GET /health`：健康检查

## 鉴权
- 为了便于本地联调，默认可不设密钥。
- 生产务必设置 `CONTROL_PLANE_KEY`，并让 bot 请求头携带 `x-control-plane-key`。

## 数据存储
当前实现为 JSON 文件（便于快速落地）：
- `data/db.json`
- `data/channel-pool.json`（可选）

生产建议迁移到 PostgreSQL + Redis（详见仓库根目录 `ARCHITECTURE.md`）。

## 样例调用
```bash
curl -X POST http://localhost:8787/api/apply \
  -H 'content-type: application/json' \
  -d '{
    "planType":"trial",
    "applicant":"Hosuke",
    "subject":"Yaya",
    "relation":"parent",
    "message":"爸爸想你了",
    "source":"landing"
  }'
```

```bash
curl -X POST http://localhost:8787/api/bind \
  -H 'content-type: application/json' \
  -H 'x-control-plane-key: replace-with-a-strong-random-secret' \
  -d '{"uid":"UID-550W-20260306-ABC123","chatId":"123456","platform":"telegram"}'
```
