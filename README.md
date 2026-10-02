# Calcura Frontend

## 项目简介

Calcura 前端是软件工程课程第一次作业的可视化客户端。页面负责输入、按键、主题、历史展示和错误提示。所有表达式解析和数值计算都由后端完成，前端不会在本地计算最终结果。

在线地址：<https://calcura-frontend.vercel.app>

## 技术栈

- React 19
- TypeScript
- Vite
- 原生 CSS 响应式布局
- lucide-react 图标

## 运行环境

- Node.js 20 或更高版本
- npm 10 或更高版本
- 可访问的 Calcura 后端

## 安装与启动

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 配置

`.env` 中设置后端地址：

```text
VITE_API_BASE_URL=http://localhost:8000
```

生产环境必须把 `VITE_API_BASE_URL` 设为后端公网地址，例如 `https://calcura-backend.vercel.app`。这是构建期变量，修改后需要重新构建前端。

## 生产构建

```powershell
npm run lint
npm run build
npm run preview
```

## 功能

- 加、减、乘、除，界面显示为 `+`、`−`、`×`、`÷`
- 小数、括号、一元正负号
- 科学计算：幂 `^`、百分号 `%`、阶乘 `n!`、平方根 `sqrt()`、绝对值 `abs()`、常数 `pi` 和 `e`、上一次答案 `Ans`
- 后端返回的计算步骤
- 非法表达式和除零的英文错误提示
- 从后端数据库读取历史记录
- 点击历史记录可再次载入表达式和步骤
- 搜索、收藏、导出 CSV、删除指定记录、清空全部记录
- 复制结果、深色/浅色主题、键盘输入
- 手机窄屏布局；顶部 API docs 打开后端 Swagger

## 前后端连接

前端只调用以下接口：

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/preview` | 先取得后端结果，不保存历史 |
| POST | `/api/calculate` | 后端再次计算并保存历史 |
| GET | `/api/history` | 读取历史 |
| GET | `/api/history/export` | 导出 CSV |
| POST | `/api/history/{id}/favorite` | 切换收藏 |
| DELETE | `/api/history/{id}` | 删除指定记录 |
| DELETE | `/api/history` | 清空历史 |
| GET | `/api/stats` | 统计摘要 |
| GET | `/api/health` | 后端状态 |

浏览器先调用 `/api/preview` 显示后端返回的结果，再在后台调用 `/api/calculate` 保存历史。浏览器不做核心计算，也不会把算好的结果交给后端存储。本地只保存主题，以及后端暂时不可达时的离线显示缓存。刷新页面后，历史记录仍以后端数据库为准。
