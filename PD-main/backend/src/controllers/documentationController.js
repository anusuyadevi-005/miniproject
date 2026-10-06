import {
  buildDocumentationFromKnowledgeModel,
  getRepositoryDocumentation,
  getLatestRepositoryDocumentation,
  regenerateDocumentationChapter,
  getChapterVersionHistory,
  assembleDocumentationMarkdown,
  assembleDocumentationHtml,
  assembleDocumentationJson,
  CHAPTER_DEFINITIONS
} from '../services/documentationEngine.js';
import { LLMProviderFactory } from '../ai/llmProviderFactory.js';

// ─── POST /api/repository/:repositoryId/documentation/generate ──────────────
export async function generateRepositoryDocumentationController(req, res) {
  try {
    const { repositoryId } = req.params;
    const { repoUrl, projectName, language } = req.body;

    if (!repositoryId && !repoUrl) {
      return res.status(400).json({ success: false, error: 'repositoryId (URL param) or repoUrl (body) is required' });
    }

    const documentation = await buildDocumentationFromKnowledgeModel({
      repositoryId,
      repoUrl,
      projectName,
      language: language || 'en'
    });

    return res.status(201).json({
      success: true,
      repositoryId: documentation.repositoryId,
      projectName: documentation.projectName,
      chaptersGenerated: documentation.chapters.length,
      language: documentation.language,
      llmProvider: documentation.llmProvider,
      generatedAt: documentation.generatedAt,
      data: documentation
    });
  } catch (error) {
    console.error('Documentation generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── GET /api/repository/:repositoryId/documentation ───────────────────────
export async function getDocumentationController(req, res) {
  try {
    const { repositoryId } = req.params;
    const { format } = req.query;

    const documentation = await getRepositoryDocumentation(repositoryId);
    if (!documentation) {
      return res.status(404).json({ success: false, error: 'Documentation not found for repositoryId: ' + repositoryId });
    }

    if (format === 'markdown') {
      const markdown = assembleDocumentationMarkdown(documentation);
      res.setHeader('Content-Type', 'text/markdown');
      return res.send(markdown);
    }

    if (format === 'html') {
      const html = assembleDocumentationHtml(documentation);
      res.setHeader('Content-Type', 'text/html');
      return res.send(wrapHtml(documentation.projectName, html));
    }

    if (format === 'json') {
      return res.json(assembleDocumentationJson(documentation));
    }

    return res.json({ success: true, data: documentation });
  } catch (error) {
    console.error('Documentation fetch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── GET /api/repository/:repositoryId/documentation/latest ────────────────
export async function getLatestDocumentationController(req, res) {
  try {
    const documentation = await getLatestRepositoryDocumentation();
    if (!documentation) {
      return res.status(404).json({ success: false, error: 'No documentation records found' });
    }
    return res.json({ success: true, data: documentation });
  } catch (error) {
    console.error('Latest documentation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── POST /api/repository/:repositoryId/documentation/chapter/:chapterId/regenerate
export async function regenerateDocumentationChapterController(req, res) {
  try {
    const { repositoryId, chapterId } = req.params;
    const { language } = req.body;

    if (!repositoryId || !chapterId) {
      return res.status(400).json({ success: false, error: 'repositoryId and chapterId are required' });
    }

    const updatedChapter = await regenerateDocumentationChapter(repositoryId, chapterId, language);
    return res.json({
      success: true,
      chapterId: updatedChapter.chapterId,
      title: updatedChapter.title,
      version: updatedChapter.version,
      generatedBy: updatedChapter.generatedBy,
      language: updatedChapter.language,
      updatedAt: updatedChapter.updatedAt,
      data: updatedChapter
    });
  } catch (error) {
    console.error('Chapter regeneration error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── GET /api/repository/:repositoryId/documentation/chapter/:chapterId/versions
export async function getChapterVersionHistoryController(req, res) {
  try {
    const { repositoryId, chapterId } = req.params;
    const history = await getChapterVersionHistory(repositoryId, chapterId);
    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('Chapter version history error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── GET /api/repository/:repositoryId/documentation/export/:format ─────────
export async function exportDocumentationController(req, res) {
  try {
    const { repositoryId, format } = req.params;
    const documentation = await getRepositoryDocumentation(repositoryId);

    if (!documentation) {
      return res.status(404).json({ success: false, error: 'Documentation not found' });
    }

    const safeProjectName = (documentation.projectName || 'repository').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'markdown') {
      const markdown = assembleDocumentationMarkdown(documentation);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Documentation.md"`);
      return res.send(markdown);
    }

    if (format === 'html') {
      const html = assembleDocumentationHtml(documentation);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Documentation.html"`);
      return res.send(wrapHtml(documentation.projectName, html));
    }

    if (format === 'json') {
      const json = assembleDocumentationJson(documentation);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Documentation.json"`);
      return res.json(json);
    }

    return res.status(400).json({ success: false, error: `Unsupported format: ${format}. Use markdown, html, or json.` });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── GET /api/repository/:repositoryId/documentation/chapter/:chapterId/export/:format
export async function exportChapterController(req, res) {
  try {
    const { repositoryId, chapterId, format } = req.params;
    const documentation = await getRepositoryDocumentation(repositoryId);

    if (!documentation) {
      return res.status(404).json({ success: false, error: 'Documentation not found' });
    }

    const chapter = documentation.chapters.find(c => c.chapterId === chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found: ' + chapterId });
    }

    const safeTitle = chapter.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.md"`);
      return res.send(chapter.markdown);
    }

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.html"`);
      return res.send(wrapHtml(chapter.title, chapter.html));
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.json"`);
      return res.json({ chapterId: chapter.chapterId, title: chapter.title, version: chapter.version, markdown: chapter.markdown, html: chapter.html });
    }

    return res.status(400).json({ success: false, error: `Unsupported format: ${format}` });
  } catch (error) {
    console.error('Chapter export error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── GET /api/documentation/providers ──────────────────────────────────────
export async function getLLMProviderStatusController(_req, res) {
  try {
    const status = LLMProviderFactory.getProviderStatus();
    const active = LLMProviderFactory.getProvider();
    return res.json({
      success: true,
      activeProvider: active.name,
      providers: status,
      chapters: CHAPTER_DEFINITIONS.map(c => ({ chapterId: c.chapterId, title: c.title }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── POST /api/documentation/providers/switch ─────────────────────────────
export async function switchLLMProviderController(req, res) {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ success: false, error: 'Provider name is required' });
    const active = LLMProviderFactory.setActiveProvider(provider);
    const status = LLMProviderFactory.getProviderStatus();
    return res.json({
      success: true,
      activeProvider: active.name,
      providers: status
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ─── Legacy: kept for backward compatibility ────────────────────────────────
export async function exportDocumentationMarkdownController(req, res) {
  req.params.format = 'markdown';
  return exportDocumentationController(req, res);
}

export async function exportDocumentationHtmlController(req, res) {
  req.params.format = 'html';
  return exportDocumentationController(req, res);
}

// ─── HTML Wrapper ────────────────────────────────────────────────────────────
function wrapHtml(title, html) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title || 'Repository Documentation'} — ASDSE</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0A0E17; color: #E2E8F0; padding: 32px; max-width: 1100px; margin: 0 auto; line-height: 1.7; }
    h1, h2, h3, h4, h5, h6 { color: #F8FAFC; margin-top: 2em; }
    h1 { font-size: 2em; border-bottom: 1px solid #1e293b; padding-bottom: 0.5em; }
    h2 { font-size: 1.5em; color: #93C5FD; }
    h3 { font-size: 1.2em; color: #6EE7B7; }
    pre { background: #020617; padding: 16px; border-radius: 10px; overflow-x: auto; border: 1px solid #1e293b; }
    code { color: #A5F3FC; font-family: 'Fira Code', monospace; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th { background: #1e293b; color: #F8FAFC; padding: 10px 14px; text-align: left; }
    td { padding: 8px 14px; border: 1px solid #1e293b; color: #CBD5E1; }
    tr:nth-child(even) td { background: #0F172A; }
    ul { color: #CBD5E1; }
    hr { border: none; border-top: 1px solid #1e293b; margin: 2em 0; }
    strong { color: #E2E8F0; }
    a { color: #60A5FA; }
  </style>
</head>
<body>${html}</body>
</html>`;
}
