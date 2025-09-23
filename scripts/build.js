const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const POSTS_PER_PAGE = 10;
const pagesDir = path.join(__dirname, '../pages');
const templatePath = path.join(__dirname, '../_templates/index.html');
const siteDir = path.join(__dirname, '../_site');
const archivesDir = path.join(siteDir, 'archives');

// --- HELPERS ---
function escapeHtml(text) {
    return text.replace(/"/g, '&quot;');
}

function getArticleFromFilename(file) {
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

    return {
        title,
        date: dateStr,
        path: `pages/${file}`,
        filename: file
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
    Object.keys(groupedByDate).sort().reverse().forEach(date => {
        html += `
<div class="date-group">
    <div class="date-header">${date}</div>
    <ul class="article-list">
`;
        groupedByDate[date].forEach(article => {
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

// --- MAIN LOGIC ---
function run() {
    // 1. Clean and create the output directory
    fs.rmSync(siteDir, { recursive: true, force: true });
    fs.mkdirSync(siteDir, { recursive: true });
    console.log(`Cleaned and created directory: ${siteDir}`);

    // 2. Copy static assets (the 'pages' directory)
    fs.cpSync(pagesDir, path.join(siteDir, 'pages'), { recursive: true });
    console.log(`Copied 'pages' directory to ${siteDir}`);

    // 3. Read all articles and sort them
    const allFiles = fs.readdirSync(pagesDir);
    const allArticles = allFiles
        .map(getArticleFromFilename)
        .filter(Boolean)
        .sort((a, b) => b.filename.localeCompare(a.filename)); // Sort by filename descending (newest first)

    if (allArticles.length === 0) {
        console.log('No articles found. Site generation stopped.');
        return;
    }

    // 4. Calculate total pages and read template
    const totalPages = Math.ceil(allArticles.length / POSTS_PER_PAGE);
    const template = fs.readFileSync(templatePath, 'utf-8');
    const currentYear = new Date().getFullYear();

    // 5. Generate each page
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

    console.log(`
Total pages built: ${totalPages}`);
}

run();
