import { DocumentationPublisher } from '../services/documentationPublisher.js';
import fs from 'fs';
import path from 'path';

// POST /api/repository/:repositoryId/documentation/publish
export async function publishDocumentationController(req, res) {
  try {
    const { repositoryId } = req.params;
    const { format, version } = req.body;

    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId parameter is required' });
    }

    const docFormat = format || 'pdf';
    const docVersion = version || '1.0';

    const result = await DocumentationPublisher.publishDocument(repositoryId, docFormat, docVersion);

    return res.status(201).json({
      success: true,
      repositoryId: result.repositoryId,
      documentationVersion: result.documentationVersion,
      format: result.format,
      downloadUrl: result.downloadUrl
    });
  } catch (error) {
    console.error('Publish documentation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/repository/:repositoryId/documentation/versions
export async function getVersionsController(req, res) {
  try {
    const { repositoryId } = req.params;

    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId parameter is required' });
    }

    const history = await DocumentationPublisher.getVersionHistory(repositoryId);
    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get versions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/repository/:repositoryId/documentation/export/:format
export async function exportDocumentController(req, res) {
  try {
    const { repositoryId, format } = req.params;
    const { v } = req.query;

    if (!repositoryId || !format) {
      return res.status(400).json({ success: false, error: 'repositoryId and format parameters are required' });
    }

    const docVersion = v || '1.0';
    const filePath = await DocumentationPublisher.getExportFilePath(repositoryId, format, docVersion);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: `Exported file not found on disk.` });
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.html') contentType = 'text/html';
    else if (ext === '.md') contentType = 'text/markdown';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Export document error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
