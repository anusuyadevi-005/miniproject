import { BaseExporter } from './BaseExporter.js';

export class DOCXExporter extends BaseExporter {
  constructor() {
    super('docx');
  }

  async export(documentData) {
    const title = documentData.projectName || 'Repository Documentation';
    const sectionsHtml = documentData.sections.map((sec, idx) => {
      const bodyHtml = this.renderMarkdown(sec.content || '<p><i>Information not found in repository.</i></p>');
      return `
        <div class="WordSection1">
          <h2 style="font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;font-size:18pt;border-bottom:1px solid #CBD5E1;padding-bottom:6px;margin-top:24pt;page-break-after:avoid;">
            ${idx + 1}. ${sec.title}
          </h2>
          <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:10.5pt;color:#334155;line-height:1.6;">
            ${bodyHtml}
          </div>
        </div>
        <br clear="all" style="page-break-before:always;" />
      `;
    }).join('\n');

    const docxContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: .5in;
      mso-footer-margin: .5in;
      mso-paper-source: 0;
    }
    div.WordSection1 {
      page: WordSection1;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #334155;
      line-height: 1.6;
    }
    h1 {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 26pt;
      color: #0F172A;
      margin-top: 12pt;
      margin-bottom: 6pt;
      font-weight: bold;
    }
    h2 {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 18pt;
      color: #0F172A;
      margin-top: 24pt;
      margin-bottom: 12pt;
      font-weight: bold;
      border-bottom: 1px solid #CBD5E1;
      padding-bottom: 6px;
      page-break-after: avoid;
    }
    h3 {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14pt;
      color: #0284C7;
      margin-top: 18pt;
      margin-bottom: 6pt;
      font-weight: bold;
      page-break-after: avoid;
    }
    h4 {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #0F766E;
      margin-top: 12pt;
      margin-bottom: 4pt;
      font-weight: bold;
      page-break-after: avoid;
    }
    p {
      font-size: 10.5pt;
      margin-top: 0;
      margin-bottom: 8pt;
      text-align: justify;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 8pt;
      padding-left: 20pt;
    }
    li {
      font-size: 10.5pt;
      margin-bottom: 3pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12pt;
      margin-bottom: 12pt;
    }
    th {
      background-color: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 8pt;
      text-align: left;
      font-size: 9.5pt;
      font-weight: bold;
      color: #0F172A;
    }
    td {
      border: 1px solid #CBD5E1;
      padding: 8pt;
      font-size: 9.5pt;
      color: #334155;
    }
    tr:nth-child(even) td {
      background-color: #F8FAFC;
    }
    pre {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 10pt;
      border-radius: 6px;
      margin-top: 8pt;
      margin-bottom: 8pt;
    }
    code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      color: #0369A1;
    }
    .inline-code {
      background-color: #F1F5F9;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      color: #0369A1;
    }
    .cover-card {
      border: 1px solid #CBD5E1;
      background-color: #F8FAFC;
      padding: 24pt;
      margin-top: 36pt;
      margin-bottom: 36pt;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="WordSection1" style="page-break-after:always;">
    <div style="border-bottom: 3px solid #0284C7; padding-bottom: 12pt; margin-top: 72pt;">
      <span style="font-size: 10pt; font-weight: bold; color: #0284C7; letter-spacing: 2px; text-transform: uppercase;">Technical Design Specification</span>
      <h1>${title}</h1>
    </div>
    
    <div class="cover-card">
      <table style="width:100%; border:none; margin:0;">
        <tr style="background:none;"><td style="border:none; font-weight:bold; color:#64748B; width:150pt; padding:4pt 0;">Repository URL</td><td style="border:none; padding:4pt 0; color:#0F172A;">${documentData.repoUrl || '—'}</td></tr>
        <tr style="background:none;"><td style="border:none; font-weight:bold; color:#64748B; padding:4pt 0;">Prepared By</td><td style="border:none; padding:4pt 0; color:#0F172A;">${documentData.repoOwner || 'ASDSE Engine'}</td></tr>
        <tr style="background:none;"><td style="border:none; font-weight:bold; color:#64748B; padding:4pt 0;">Branch & Commit</td><td style="border:none; padding:4pt 0; color:#0F172A;">${documentData.repoBranch || 'main'} [${(documentData.commitHash || 'HEAD').substring(0, 7)}]</td></tr>
        <tr style="background:none;"><td style="border:none; font-weight:bold; color:#64748B; padding:4pt 0;">Document Version</td><td style="border:none; padding:4pt 0; color:#0F172A;">v${documentData.documentationVersion || '1.0'}</td></tr>
        <tr style="background:none;"><td style="border:none; font-weight:bold; color:#64748B; padding:4pt 0;">Technology Stack</td><td style="border:none; padding:4pt 0; color:#0F172A;">${documentData.techStackText || 'Polyglot'}</td></tr>
        <tr style="background:none;"><td style="border:none; font-weight:bold; color:#64748B; padding:4pt 0;">Generated Date</td><td style="border:none; padding:4pt 0; color:#0F172A;">${documentData.generatedDate || new Date().toLocaleString()}</td></tr>
      </table>
    </div>

    <div style="margin-top: 100pt; text-align: center; font-size: 9pt; color: #64748B; border-top: 1px solid #CBD5E1; padding-top: 12pt;">
      Generated automatically by ASDSE — Adaptive Semantic Documentation Synchronization Engine
    </div>
  </div>

  <br clear="all" style="page-break-before:always;" />

  <!-- Chapters -->
  ${sectionsHtml}
</body>
</html>`;

    return Buffer.from(docxContent, 'utf-8');
  }

  renderMarkdown(markdown) {
    if (!markdown) return '';
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/^######\s+(.*)$/gm, '<h5>$1</h5>')
      .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
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
