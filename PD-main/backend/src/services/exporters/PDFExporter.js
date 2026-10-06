import { BaseExporter } from './BaseExporter.js';
import { PDFReportGenerator } from '../../generator/pdfReportGenerator.js';

export class PDFExporter extends BaseExporter {
  constructor() {
    super('pdf');
  }

  async export(documentData) {
    return PDFReportGenerator.generatePDFBuffer(documentData);
  }
}
