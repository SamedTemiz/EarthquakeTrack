const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname);
const indexPath = path.join(rootDir, 'index.html');

// Read index.html to extract sidebar
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Match the sidebar HTML exactly
const sidebarMatch = indexHtml.match(/<aside class="sidebar">[\s\S]*?<\/aside>/);
if (!sidebarMatch) {
    console.error("Sidebar not found in index.html");
    process.exit(1);
}

let baseSidebarHtml = sidebarMatch[0];

// Remove the earthquake-list-container from the secondary pages sidebar
const listStart = baseSidebarHtml.indexOf('<div class="earthquake-list-container">');
const sidebarFooter = baseSidebarHtml.indexOf('<div class="sidebar-footer">');
if (listStart !== -1 && sidebarFooter !== -1) {
    baseSidebarHtml = baseSidebarHtml.substring(0, listStart) + baseSidebarHtml.substring(sidebarFooter);
}

// Modify main-nav links to navigate to index.html
baseSidebarHtml = baseSidebarHtml.replace(/<li class="active">([\s\S]*?)<\/li>/, '<li onclick="window.location.href=\'index.html\'" style="cursor:pointer;">$1</li>');
// Son Depremler
baseSidebarHtml = baseSidebarHtml.replace(/<li(.*?)>\s*<span class="icon">([\s\S]*?)<span data-i18n="activeIssues">Son Depremler<\/span>\s*<\/li>/, 
    '<li onclick="window.location.href=\'index.html?view=active-issues\'" style="cursor:pointer;">\n<span class="icon">$2<span data-i18n="activeIssues">Son Depremler</span>\n</li>');
// Panel
baseSidebarHtml = baseSidebarHtml.replace(/<li>\s*<span class="icon">([\s\S]*?)<span data-i18n="dashboard">Panel<\/span>\s*<\/li>/, 
    '<li onclick="window.location.href=\'index.html?view=dashboard\'" style="cursor:pointer;">\n<span class="icon">$1<span data-i18n="dashboard">Panel</span>\n</li>');
// Konumlar
baseSidebarHtml = baseSidebarHtml.replace(/<li>\s*<span class="icon">([\s\S]*?)<span data-i18n="locations">Konumlar<\/span>\s*<\/li>/, 
    '<li onclick="window.location.href=\'index.html?view=locations\'" style="cursor:pointer;">\n<span class="icon">$1<span data-i18n="locations">Konumlar</span>\n</li>');

// List of pages to apply layout to (automated)
const getPages = () => {
    const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html') && f !== 'index.html');
    const blogFiles = fs.existsSync('blog') ? fs.readdirSync('blog').filter(f => f.endsWith('.html')).map(f => `blog/${f}`) : [];
    return [...rootFiles, ...blogFiles];
};

const pages = getPages();

pages.forEach(page => {
    const pagePath = path.join(rootDir, page);
    if (!fs.existsSync(pagePath)) return;

    let html = fs.readFileSync(pagePath, 'utf-8');

    // 1. If it already has a layout, extract the content and reset html
    if (html.includes('<div class="dashboard-container')) {
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
        if (mainMatch) {
            const content = mainMatch[1].trim();
            // Basic extraction: replace the whole container with just the content to start over
            html = html.replace(/<div class="dashboard-container[\s\S]*?<\/main>\s*<\/div>/, content);
        }
    }

    // 2. Cleanup: Remove old navs, duplicate scripts etc.
    // Use flexible regex for top-nav to catch any attributes
    html = html.replace(/<nav class="top-nav"[^>]*>[\s\S]*?<\/nav>/g, '');
    html = html.replace(/<script src="(\.\.\/)?js\/replace-nav\.js" defer><\/script>/g, '');
    
    // REMOVE internal style overrides that conflict with dashboard
    // We want to keep the page's specific styles but some might need cleaning
    // For now, let's just make sure we don't have body specific paddings in style blocks
    html = html.replace(/(?<![a-zA-Z\-])body\s*{[^}]*padding[^}]*}/gi, '/* removed body padding style */');
    html = html.replace(/(?<![a-zA-Z\-])body\.[a-z-]+\s*{[^}]*padding[^}]*}/gi, '/* removed body class padding style */');

    // Add layout.js script if missing
    const scriptPath = page.includes('blog/') ? '../js/layout.js' : 'js/layout.js';
    const scriptTag = `<script type="module" src="${scriptPath}"></script>`;
    if (!html.includes('js/layout.js')) {
        html = html.replace('</body>', `    ${scriptTag}\n</body>`);
    }

    // 3. Generate customized sidebar for this page
    let customSidebar = baseSidebarHtml;
    const pageName = path.basename(page);
    
    // Remove existing .active classes from info center links
    customSidebar = customSidebar.replace(/class="nav-link-item active"/g, 'class="nav-link-item"');
    
    if (pageName === 'blog.html' || page.includes('blog/')) {
        customSidebar = customSidebar.replace('href="blog.html" class="nav-link-item"', 'href="blog.html" class="nav-link-item active"');
        customSidebar = customSidebar.replace('href="../blog.html" class="nav-link-item"', 'href="../blog.html" class="nav-link-item active"');
    } else if (pageName === 'preparedness.html') {
        customSidebar = customSidebar.replace('href="preparedness.html" class="nav-link-item"', 'href="preparedness.html" class="nav-link-item active"');
    } else if (pageName === 'education.html') {
        customSidebar = customSidebar.replace('href="education.html" class="nav-link-item"', 'href="education.html" class="nav-link-item active"');
    }

    // Adjust paths for nested files
    if (page.includes('blog/')) {
        customSidebar = customSidebar.replace(/href="(?!http)([^"]+)"/g, (match, p1) => {
            if (p1.startsWith('#') || p1.startsWith('javascript:')) return match;
            return `href="../${p1}"`;
        });
        customSidebar = customSidebar.replace(/onclick="window.location.href='index.html(?!')/g, "onclick=\"window.location.href='../index.html");
    }

    // 4. Wrap body content in dashboard container
    // Normalize body tag and preserve only what's inside
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)(?=<script)/i);
    if (bodyMatch) {
        // Enforce clean body tag
        html = html.replace(/<body[^>]*>/i, '<body>');
        
        const bodyContent = bodyMatch[1].trim();
        const wrappedContent = `
    <div class="dashboard-container static-layout">
        ${customSidebar}
        <main class="main-content scrollable">
            ${bodyContent}
        </main>
    </div>`;
        html = html.replace(bodyMatch[1], '\n' + wrappedContent + '\n    ');
    }

    fs.writeFileSync(pagePath, html);
    console.log(`Updated ${page}`);
});
