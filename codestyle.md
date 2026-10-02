# Frontend Code Style

参考来源：

- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

## 本项目约定

- 使用 TypeScript 严格模式，组件和 API 数据均定义类型。
- React 组件使用 PascalCase，函数和变量使用 camelCase。
- 组件负责界面和交互，网络请求集中在 `src/services/api.ts`。
- 不在前端实现核心数学计算；前端只提交表达式并展示后端结果。
- 事件处理函数保持短小，复杂逻辑拆分为可复用函数。
- 每个按钮提供明确的视觉状态和可访问标签。
- 保持响应式布局，避免将尺寸写死为单一屏幕。
- 用户可见的错误信息必须清晰，不能静默吞掉请求失败。
