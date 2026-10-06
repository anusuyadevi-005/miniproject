export class BaseExporter {
  constructor(format) {
    this.format = format;
  }

  /**
   * Export the structured document data into a buffer.
   * @param {Object} documentData - The assembled 26-section document data.
   * @returns {Promise<Buffer>}
   */
  async export(documentData) {
    throw new Error('export() must be implemented in subclasses');
  }
}
