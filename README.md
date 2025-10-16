# MyWebClips

一个网页剪辑归档系统，通过 Chrome 插件 SingleFile 结合 GitHub Token 上传文件到 GitHub Pages，然后经由 GitHub Action 编译成网页展示。

## 项目简介

这是一个自动化的网页剪辑归档系统，主要功能包括：

- **网页保存**：使用 SingleFile Chrome 扩展保存感兴趣的网页
- **自动归档**：保存的网页自动按日期和元数据进行组织
- **RSS 订阅**：支持 RSS 订阅新剪辑内容
- **响应式设计**：简洁现代的界面，适配各种设备
- **GitHub Pages 集成**：自动部署到 GitHub Pages

## 工作原理

1. **保存网页**：使用 SingleFile Chrome 扩展保存感兴趣的网页
2. **自动处理**：GitHub Actions 工作流检测新文件并触发构建
3. **元数据提取**：构建脚本提取元数据（原始 URL、保存日期、描述等）
4. **网站生成**：创建带有分页的静态归档页面
5. **RSS 订阅**：为订阅者生成 RSS 源

## 项目结构

```
/
├── pages/                 # SingleFile 保存的网页文件
│   ├── 2025-09-20-文章标题.html
│   └── ...
├── scripts/
│   └── build.js          # 构建脚本，处理页面生成
├── _templates/
│   └── index.html        # HTML 模板文件
├── .github/
│   └── workflows/
│       └── build.yml     # GitHub Actions 工作流配置
├── _site/                # 生成的静态网站（构建输出）
├── CNAME                 # 自定义域名配置
└── README.md             # 项目说明文档
```

## 使用指南

### 浏览归档

访问 [https://webclips.zhaochunqi.com](https://webclips.zhaochunqi.com) 浏览网页剪辑归档。

### RSS 订阅

通过 [https://webclips.zhaochunqi.com/rss.xml](https://webclips.zhaochunqi.com/rss.xml) 订阅 RSS 源，获取新剪辑通知。

## 贡献指南

### 添加新剪辑

1. 安装 [SingleFile Chrome 扩展](https://chrome.google.com/webstore/detail/singlefile/mpiodijhokgodhhofbcjdecpffjipkle)
2. 使用 SingleFile 保存网页，将其保存为 HTML 文件
3. 将 HTML 文件提交到 `pages/` 目录
4. 推送到 GitHub，GitHub Actions 工作流将自动构建和部署

### 本地开发

1. **克隆仓库**
   ```bash
   git clone https://github.com/zhaochunqi/MyWebClips.git
   cd MyWebClips
   ```

2. **安装 Node.js**（版本 20 或更高）

3. **运行构建脚本**
   ```bash
   node scripts/build.js
   ```

4. **查看生成站点**
   在浏览器中打开 `_site/index.html` 或本地服务：
   ```bash
   # 使用 Python（如可用）
   cd _site && python -m http.server 8000

   # 使用 Node.js
   npx serve _site
   ```

### 构建过程详解

构建脚本 (`scripts/build.js`) 执行以下关键功能：

- **元数据提取**：解析保存的 HTML 文件，提取：
  - 原始 URL（来自各种元标签）
  - 保存时间戳
  - 页面描述

- **智能缓存**：使用 `.metadata.json` 缓存提取的元数据，仅重新处理更改的文件

- **分页功能**：将文章分成多个页面（每页 10 篇文章）

- **RSS 生成**：创建包含最近 20 篇文章的 RSS 源

- **响应式 HTML**：生成带有嵌入式 CSS 的简洁现代 HTML

### 自定义配置

#### 修改每页文章数

编辑 `scripts/build.js` 并修改 `POSTS_PER_PAGE` 常量：

```javascript
const POSTS_PER_PAGE = 15; // 从 10 改为 15
```

#### 修改模板

编辑 `_templates/index.html` 来自定义外观：

- 在 `:root` 中更新 CSS 变量以更改颜色和样式
- 根据需要修改 HTML 结构
- 添加新功能或更改布局

#### 工作流配置

可以自定义 `.github/workflows/build.yml` 中的 GitHub Actions 工作流：

- 在 `actions/setup-node@v4` 中更改 Node.js 版本
- 在 `on:` 部分修改构建触发器
- 根据需要添加额外的构建步骤

## 技术细节

### 元数据提取

构建脚本使用多种策略从保存的 HTML 中提取元数据：

1. **保存日期**：在 HTML 内容中查找 "saved date:"
2. **原始 URL**：搜索：
   - 文本内容中的 URL 模式
   - 规范链接
   - Open Graph URL 元标签
   - Twitter Card URL 元标签
3. **描述信息**：从以下来源提取：
   - 描述元标签
   - Open Graph 描述
   - Twitter Card 描述

### 文件命名规范

保存的文件应遵循以下模式：
```
YYYY-MM-DD-描述性标题.html
```

示例：
- `2025-09-20-如何使用-SingleFile.html`
- `2025-09-21-高级-JavaScript-技巧.html`

### RSS 源

生成的 RSS 源包含：
- 文章标题和描述
- 站点归档页面的链接
- 基于保存时间戳的发布日期
- 描述中的原始来源 URL

## 故障排除

### 构建错误

如果 GitHub Actions 构建失败：

1. 检查 `pages/` 中的所有 HTML 文件是否有效
2. 确保文件名遵循命名规范
3. 验证 Node.js 依赖项是否可用

### 元数据缺失

如果文章显示时缺少正确的元数据：

1. 检查 HTML 文件是否包含预期的元标签
2. 验证 HTML 内容中的保存日期格式
3. 如果未找到保存日期，构建脚本将使用文件名日期作为备选

### 本地构建问题

对于本地构建问题：

1. 确保安装了 Node.js 20+
2. 检查项目目录中的文件权限
3. 验证所有必需文件都存在

## 开源许可

本项目为开源项目，可自由使用、修改和分发。

## 支持

如有问题或疑问，请在 GitHub 上提交 Issue。

---

*本文档最后更新于 2025 年*
