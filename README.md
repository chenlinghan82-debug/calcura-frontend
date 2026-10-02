# Calcura Frontend

## 项目简介

Calcura 是一个前后端分离的 Web 计算器。前端负责界面、输入和展示，所有表达式解析与计算都由后端完成。

## 技术栈

- React + TypeScript
- Vite
- 原生 CSS 响应式布局
- lucide-react 图标

## 运行环境

Node.js 20+，npm 10+。

## 安装与启动

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

默认访问 `http://localhost:5173`。`.env` 中的 `VITE_API_BASE_URL` 指向后端地址，默认为 `http://localhost:8000`。

## 功能

- 加、减、乘、除；
- 括号、优先级、小数和一元正负号；
- 后端错误提示与除零保护；
- 后端数据库历史记录；
- 指定记录删除和一键清空；
- 历史搜索；
- 统计摘要；
- 键盘输入、Enter 计算、Esc 清空、Backspace 删除；
- 主题切换和结果复制。

## 生产构建

```powershell
npm run build
npm run preview
```
