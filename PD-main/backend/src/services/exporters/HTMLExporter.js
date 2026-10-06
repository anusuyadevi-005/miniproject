import { BaseExporter } from './BaseExporter.js';

export class HTMLExporter extends BaseExporter {
  constructor() {
    super('html');
  }

  async export(documentData) {
    const title = documentData.projectName || 'Repository Documentation';
    const sectionsHtml = documentData.sections.map((sec, idx) => {
      const id = sec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Simple markdown-to-html conversion for sections
      const bodyHtml = this.renderMarkdown(sec.content || '<p><i>Information not found in repository.</i></p>');
      return `
        <section id="${id}" class="doc-section">
          <h2>${idx + 1}. ${sec.title}</h2>
          <div class="section-body">
            ${bodyHtml}
          </div>
        </section>
      `;
    }).join('\n');

    const tocHtml = documentData.sections.map((sec, idx) => {
      const id = sec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `<li><a href="#${id}">${idx + 1}. ${sec.title}</a></li>`;
    }).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — ASDSE</title>
  <style>
    :root {
      --bg-dark: #0A0E17;
      --bg-card: #0F172A;
      --border-color: #1e293b;
      --text-main: #E2E8F0;
      --text-muted: #94A3B8;
      --accent: #38BDF8;
      --accent-hover: #0284C7;
      --success: #10B981;
      --warning: #F59E0B;
      --error: #EF4444;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg-dark);
      color: var(--text-main);
      margin: 0;
      padding: 0;
      display: flex;
      height: 100vh;
      overflow: hidden;
      line-height: 1.7;
    }
    /* TOC Sidebar */
    .sidebar {
      width: 280px;
      background: var(--bg-card);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      height: 100%;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .sidebar-header h1 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: #fff;
    }
    .sidebar-header p {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 5px 0 0 0;
    }
    .toc-list {
      list-style: none;
      padding: 10px;
      margin: 0;
      overflow-y: auto;
      flex-1: 1;
    }
    .toc-list li {
      margin-bottom: 2px;
    }
    .toc-list a {
      display: block;
      padding: 8px 12px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.8rem;
      border-radius: 8px;
      transition: all 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .toc-list a:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }
    /* Content Pane */
    .content-pane {
      flex: 1;
      overflow-y: auto;
      padding: 40px;
      box-sizing: border-box;
      scroll-behavior: smooth;
    }
    .document-wrapper {
      max-width: 900px;
      margin: 0 auto;
    }
    /* Cover Page Section */
    .cover-page {
      padding: 60px 40px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      margin-bottom: 40px;
      box-shadow: 0 4px 30px rgba(0,0,0,0.3);
    }
    .cover-header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .cover-title {
      font-size: 2.2rem;
      font-weight: 800;
      color: #fff;
      margin: 10px 0 0 0;
    }
    .cover-subtitle {
      color: var(--accent);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .meta-item {
      font-size: 0.85rem;
    }
    .meta-label {
      color: var(--text-muted);
      font-weight: 600;
    }
    .meta-value {
      color: #fff;
      margin-top: 4px;
    }
    .cover-footer {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
    }
    /* Sections styling */
    .doc-section {
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--border-color);
    }
    .doc-section h2 {
      font-size: 1.5rem;
      color: #fff;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
      margin-top: 0;
    }
    /* Markdown body elements */
    .section-body p {
      font-size: 0.9rem;
      color: #CBD5E1;
      margin: 10px 0;
    }
    .section-body h3 {
      font-size: 1.15rem;
      color: var(--accent);
      margin-top: 20px;
    }
    .section-body h4 {
      font-size: 1rem;
      color: var(--success);
      margin-top: 15px;
    }
    .section-body ul {
      padding-left: 20px;
      font-size: 0.9rem;
      color: #CBD5E1;
    }
    .section-body li {
      margin-bottom: 6px;
    }
    pre {
      background: #020617;
      border: 1px solid var(--border-color);
      padding: 16px;
      border-radius: 12px;
      overflow-x: auto;
    }
    code {
      color: #A5F3FC;
      font-family: monospace;
      font-size: 0.85rem;
    }
    .inline-code {
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      color: #A5F3FC;
      font-size: 0.85em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 0.85rem;
    }
    th {
      background: var(--border-color);
      color: #fff;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-color);
      color: #CBD5E1;
    }
    tr:nth-child(even) td {
      background: rgba(255,255,255,0.02);
    }
    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 30px 0;
    }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>Documentation Workspace</h1>
      <p>${title}</p>
    </div>
    <ul class="toc-list">
      ${tocHtml}
    </ul>
  </aside>

  <!-- Content Pane -->
  <main class="content-pane">
    <div class="document-wrapper">
      <!-- Cover Page -->
      <header class="cover-page">
        <div class="cover-header">
          <div class="cover-subtitle">Technical Design Specification</div>
          <h1 class="cover-title">${title}</h1>
        </div>
        <div class="metadata-grid">
          <div class="meta-item">
            <div class="meta-label">Repository URL</div>
            <div class="meta-value">${documentData.repoUrl || '—'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Prepared By</div>
            <div class="meta-value">${documentData.repoOwner || 'ASDSE Team'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Branch & Commit</div>
            <div class="meta-value">${documentData.repoBranch || 'main'} [${(documentData.commitHash || 'HEAD').substring(0, 7)}]</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Document Version</div>
            <div class="meta-value">v${documentData.documentationVersion || '1.0'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Technology Stack</div>
            <div class="meta-value">${documentData.techStackText || 'Polyglot'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Generated Date</div>
            <div class="meta-value">${documentData.generatedDate || new Date().toLocaleString()}</div>
          </div>
        </div>
        <div class="cover-footer">
          Generated automatically by ASDSE — Adaptive Semantic Documentation Synchronization Engine
        </div>
      </header>

      <!-- Main Chapters -->
      ${sectionsHtml}
    </div>
  </main>
</body>
</html>`;

    return Buffer.from(htmlContent, 'utf-8');
  }

  renderMarkdown(markdown) {
    if (!markdown) return '';
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code class="language-${lang}">${code.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)*)/gm, (_, headerRow, bodyRows) => {
        const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
        const ths = headers.map(h => `<th>${h}</th>`).join('');
        const rows = (bodyRows || '').trim().split('\n').filter(Boolean).map(row => {
          const cells = row.split('|').map(c => c.trim()).filter(Boolean);
          return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
        }).join('');
        return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
      })
      .replace(/^---$/gm, '<hr />')
      .replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n{2,}/g, '\n<p>')
      .replace(/\n/g, '<br/>');
  }
}
