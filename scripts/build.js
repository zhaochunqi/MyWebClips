const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const POSTS_PER_PAGE = 20;
const pagesDir = path.join(__dirname, '../pages');
const templatePath = path.join(__dirname, '../_templates/index.html');
const siteDir = path.join(__dirname, '../_site');
const archivesDir = path.join(siteDir, 'archives');
const metadataPath = path.join(__dirname, '../.metadata.json');

// --- HELPERS ---
function escapeHtml(text) {
    return text.replace(/"/g, '&quot;');
}

function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function loadMetadata() {
    try {
        if (fs.existsSync(metadataPath)) {
            const content = fs.readFileSync(metadataPath, 'utf-8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn('Warning: Could not load metadata file:', error.message);
    }
    return {};
}

function saveMetadata(metadata) {
    try {
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
        console.warn('Warning: Could not save metadata file:', error.message);
    }
}

function extractMetadataFromHtml(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // 提取 saved date
        let savedTimestamp = 0;
        const dateMatch = content.match(/saved date:\s*([^<\n]+)/);
        if (dateMatch) {
            const dateStr = dateMatch[1].trim();
            savedTimestamp = new Date(dateStr).getTime() / 1000;
            if (isNaN(savedTimestamp)) savedTimestamp = 0;
        }

        // 提取原始 URL
        let originalUrl = null;
        const urlPatterns = [
            /url:\s*(https?:\/\/[^\s<>"']+)/,
            /info:\s*本页面原链接来源于:\s*(https?:\/\/[^\s<>"']+)/,
            /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/,
            /<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/,
            /<meta[^>]*name=["']twitter:url["'][^>]*content=["']([^"']+)["']/
        ];

        for (const pattern of urlPatterns) {
            const match = content.match(pattern);
            if (match) {
                originalUrl = match[1];
                break;
            }
        }

        // 提取描述
        let description = '';
        const descPatterns = [
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/,
            /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/,
            /<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/
        ];

        for (const pattern of descPatterns) {
            const match = content.match(pattern);
            if (match) {
                description = match[1].substring(0, 500);
                break;
            }
        }

        return {
            savedTimestamp,
            originalUrl,
            description
        };
    } catch (error) {
        console.warn(`Warning: Could not extract metadata from ${filePath}:`, error.message);
    }
    return {
        savedTimestamp: 0,
        originalUrl: null,
        description: ''
    };
}

function getArticleFromFilename(file, metadata) {
    if (file === "index.html" || !file.endsWith('.html')) return null;

    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-/);
    if (!dateMatch) return null;

    const dateStr = dateMatch[1];
    const title = file
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/\.html$/, '')
        .replace(/%20/g, ' ')
        .replace(/%E2%80%94/g, '—')
        .replace(/%EF%BC%9A/g, '：');

    const filePath = path.join(pagesDir, file);
    let savedTimestamp = 0;
    let originalUrl = null;
    let description = '';

    // 检查元数据缓存
    if (metadata[file]) {
        const stat = fs.statSync(filePath);
        const fileModTime = stat.mtime.getTime();

        // 如果文件没有被修改，使用缓存的元数据
        if (metadata[file].lastModified === fileModTime) {
            savedTimestamp = metadata[file].savedTimestamp;
            originalUrl = metadata[file].originalUrl;
            description = metadata[file].description;
        } else {
            // 文件被修改了，重新提取完整元数据
            const extractedData = extractMetadataFromHtml(filePath);
            savedTimestamp = extractedData.savedTimestamp;
            originalUrl = extractedData.originalUrl;
            description = extractedData.description;

            metadata[file] = {
                savedTimestamp,
                originalUrl,
                description,
                lastModified: fileModTime
            };
        }
    } else {
        // 没有缓存，提取完整元数据
        const extractedData = extractMetadataFromHtml(filePath);
        savedTimestamp = extractedData.savedTimestamp;
        originalUrl = extractedData.originalUrl;
        description = extractedData.description;

        const stat = fs.statSync(filePath);
        metadata[file] = {
            savedTimestamp,
            originalUrl,
            description,
            lastModified: stat.mtime.getTime()
        };
    }

    // 如果没有找到saved date，使用文件名的日期作为备选
    if (savedTimestamp === 0) {
        savedTimestamp = new Date(dateStr).getTime() / 1000;
    }

    return {
        title,
        date: dateStr,
        path: `pages/${file}`,
        filename: file,
        savedTimestamp,
        originalUrl,
        description
    };
}

function generateArticlesHtml(articles) {
    const groupedByDate = {};
    articles.forEach(article => {
        if (!groupedByDate[article.date]) {
            groupedByDate[article.date] = [];
        }
        groupedByDate[article.date].push(article);
    });

    let html = '';
    // 对日期进行降序排序（最新的日期在前）
    Object.keys(groupedByDate).sort().reverse().forEach(date => {
        html += `
 <div class="date-group">
     <div class="date-header">${date}</div>
     <ul class="article-list">
 `;
        // 在每个日期组内，对文章按时间降序排序（最新的文章在前）
        groupedByDate[date]
            .sort((a, b) => b.savedTimestamp - a.savedTimestamp)
            .forEach(article => {
                // Note: The href is root-relative, so it works from any page depth.
                html += `
         <li class="article-item">
             <a href="/${article.path}" target="_blank" class="article-link">${article.title}</a>
             <button class="copy-btn" data-title="${escapeHtml(article.title)}" data-path="${article.path}">复制链接</button>
         </li>
 `;
            });
        html += `    </ul>
 </div>
 `;
    });
    return html;
}

function generatePaginationHtml(currentPage, totalPages) {
    let html = '<div class="pagination">';

    // Previous Page Link
    if (currentPage > 1) {
        const prevPagePath = currentPage === 2 ? '/' : `/archives/${currentPage - 1}/`;
        html += `<a href="${prevPagePath}" class="pagination-link">« 上一页</a>`;
    }

    // Page Number Info
    html += `<span class="pagination-current">第 ${currentPage} / ${totalPages} 页</span>`;

    // Next Page Link
    if (currentPage < totalPages) {
        const nextPagePath = `/archives/${currentPage + 1}/`;
        html += `<a href="${nextPagePath}" class="pagination-link">下一页 »</a>`;
    }

    html += '</div>';
    return html;
}


function generateRSSXML(articles) {
    const siteUrl = 'https://webclips.zhaochunqi.com';
    const currentDate = new Date().toUTCString();

    // 确保RSS文章也按时间正确排序，并只保留最近20篇
    const sortedArticles = articles
        .sort((a, b) => b.savedTimestamp - a.savedTimestamp) // 按时间降序排序
        .slice(0, 20); // 只保留最近20篇文章

    let rssItems = sortedArticles.map(article => {
        // 构造生成后的URL（用于guid）
        const generatedUrl = `${siteUrl}/${article.path}`;

        // 构造发布日期
        const pubDate = new Date(article.savedTimestamp * 1000).toUTCString();

        // 使用缓存的元数据，无需重新读取文件
        // link使用自己网站的文章页面，guid保持唯一标识
        const linkUrl = escapeXml(generatedUrl);
        const guidUrl = escapeXml(generatedUrl);

        // 构建描述内容，包含原链接信息
        let description = article.description || '';
        if (article.originalUrl) {
            const originalLinkText = `\n\n原文链接：${article.originalUrl}`;
            description = description ? description + originalLinkText : `查看完整内容${originalLinkText}`;
        }

        return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${linkUrl}</link>
      <guid>${guidUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[网页剪辑归档]]></title>
    <description><![CDATA[收集的有价值网页内容]]></description>
    <link>${siteUrl}/</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${currentDate}</lastBuildDate>
    <generator>WebClips Build Script</generator>
    <language>zh-cn</language>
${rssItems}
  </channel>
</rss>`;
}

// --- MAIN LOGIC ---
function run() {
    // 1. Load metadata cache
    console.log('Loading metadata cache...');
    const metadata = loadMetadata();

    // 2. Clean and create the output directory
    fs.rmSync(siteDir, { recursive: true, force: true });
    fs.mkdirSync(siteDir, { recursive: true });
    console.log(`Cleaned and created directory: ${siteDir}`);

    // 3. Copy static assets (the 'pages' directory and realtime.html)
    fs.cpSync(pagesDir, path.join(siteDir, 'pages'), { recursive: true });
    console.log(`Copied 'pages' directory to ${siteDir}`);

    // Copy realtime.html to _site directory
    const realtimeSource = path.join(__dirname, '../realtime.html');
    if (fs.existsSync(realtimeSource)) {
        fs.copyFileSync(realtimeSource, path.join(siteDir, 'realtime.html'));
        console.log(`Copied realtime.html to ${siteDir}`);
    }

    // Copy robots.txt to _site directory
    const robotsSource = path.join(__dirname, '../robots.txt');
    if (fs.existsSync(robotsSource)) {
        fs.copyFileSync(robotsSource, path.join(siteDir, 'robots.txt'));
        console.log(`Copied robots.txt to ${siteDir}`);
    }

    // 4. Read all articles and sort them
    const allFiles = fs.readdirSync(pagesDir);
    const allArticles = allFiles
        .map(file => getArticleFromFilename(file, metadata))
        .filter(Boolean)
        .sort((a, b) => b.savedTimestamp - a.savedTimestamp); // Sort by saved date descending (newest first)

    // 5. Clean up metadata for deleted files
    const existingFiles = new Set(allFiles);
    const metadataKeys = Object.keys(metadata);
    let removedCount = 0;

    metadataKeys.forEach(filename => {
        if (!existingFiles.has(filename)) {
            delete metadata[filename];
            removedCount++;
        }
    });

    if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} deleted file(s) from metadata cache`);
    }

    // 6. Save updated metadata cache
    console.log('Saving metadata cache...');
    saveMetadata(metadata);

    if (allArticles.length === 0) {
        console.log('No articles found. Site generation stopped.');
        return;
    }

    // 7. Calculate total pages and read template
    const totalPages = Math.ceil(allArticles.length / POSTS_PER_PAGE);
    const template = fs.readFileSync(templatePath, 'utf-8');
    const currentYear = new Date().getFullYear();

    // 8. Generate each page
    for (let i = 1; i <= totalPages; i++) {
        const startIndex = (i - 1) * POSTS_PER_PAGE;
        const endIndex = startIndex + POSTS_PER_PAGE;
        const pageArticles = allArticles.slice(startIndex, endIndex);

        const articlesHtml = generateArticlesHtml(pageArticles);
        const paginationHtml = generatePaginationHtml(i, totalPages);

        let finalHtml = template.replace('<!-- ARCHIVES_PLACEHOLDER -->', articlesHtml);
        finalHtml = finalHtml.replace('<!-- PAGINATION_PLACEHOLDER -->', paginationHtml);
        finalHtml = finalHtml.replace('<!-- YEAR_PLACEHOLDER -->', currentYear);

        let pageOutputDir;
        if (i === 1) {
            pageOutputDir = siteDir; // Page 1 is index.html in the root of _site
        } else {
            pageOutputDir = path.join(archivesDir, `${i}`);
        }
        fs.mkdirSync(pageOutputDir, { recursive: true });
        fs.writeFileSync(path.join(pageOutputDir, 'index.html'), finalHtml);

        console.log(`Successfully built page ${i} to ${path.join(pageOutputDir, 'index.html')}`);
    }

    // 9. Generate RSS feed
    console.log('Generating RSS feed...');
    try {
        const rssXML = generateRSSXML(allArticles);
        fs.writeFileSync(path.join(siteDir, 'rss.xml'), rssXML);
        console.log(`Successfully generated RSS feed to ${path.join(siteDir, 'rss.xml')}`);
    } catch (error) {
        console.error('Error generating RSS feed:', error);
    }

    console.log(`
Total pages built: ${totalPages}
RSS feed generated: rss.xml`);
}

run();
