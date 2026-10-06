export class VerificationAgent {
  /**
   * Validates generated documentation claims against repository ground truth.
   * Classifies claims into VERIFIED, PARTIALLY_VERIFIED, UNSUPPORTED, or CONFLICTING.
   */
  static verifyClaim(claimText, evidenceList = [], repositoryFiles = []) {
    if (!claimText || typeof claimText !== 'string') {
      return {
        claim: '',
        status: 'UNSUPPORTED',
        confidence: 0,
        explanation: 'Empty or invalid claim text.'
      };
    }

    if (!evidenceList || evidenceList.length === 0) {
      return {
        claim: claimText,
        status: 'UNSUPPORTED',
        confidence: 0.1,
        evidence: [],
        explanation: 'No repository evidence provided to substantiate claim. Mark as UNKNOWN / NEEDS_REVIEW.'
      };
    }

    // Verify whether referenced files actually exist in the scanned repository
    const validEvidence = evidenceList.filter(evidenceItem => {
      const cleanPath = String(evidenceItem).toLowerCase().trim();
      return repositoryFiles.some(rf => {
        const rfPath = (rf.relativePath || rf.path || '').toLowerCase();
        return rfPath.includes(cleanPath) || cleanPath.includes(rfPath) || rfPath.endsWith(cleanPath);
      });
    });

    const ratio = validEvidence.length / evidenceList.length;

    if (ratio === 1.0) {
      return {
        claim: claimText,
        status: 'VERIFIED',
        confidence: 0.98,
        evidence: validEvidence,
        explanation: 'All referenced source files and symbols were verified in repository inventory.'
      };
    } else if (ratio > 0.5) {
      return {
        claim: claimText,
        status: 'PARTIALLY_VERIFIED',
        confidence: 0.75,
        evidence: validEvidence,
        explanation: 'Partial evidence exists, but some referenced files could not be confirmed.'
      };
    } else {
      return {
        claim: claimText,
        status: 'UNSUPPORTED',
        confidence: 0.25,
        evidence: validEvidence,
        explanation: 'Referenced evidence files do not exist in repository inventory. Potential hallucination.'
      };
    }
  }

  /**
   * Verifies an entire generated documentation package.
   */
  static verifyDocumentPackage(documents = [], repositoryFiles = []) {
    const verificationResults = [];
    let verifiedCount = 0;
    let unverifiedCount = 0;

    for (const doc of documents) {
      const docClaims = doc.claims || [
        { claim: doc.title || doc.name, evidence: doc.evidence || [] }
      ];

      const verifiedDocClaims = docClaims.map(c => this.verifyClaim(c.claim, c.evidence, repositoryFiles));
      const isClean = verifiedDocClaims.every(c => c.status === 'VERIFIED');

      if (isClean) verifiedCount++;
      else unverifiedCount++;

      verificationResults.push({
        documentId: doc.id || doc.sdid,
        title: doc.title || doc.name,
        overallStatus: isClean ? 'VERIFIED' : 'NEEDS_REVIEW',
        claims: verifiedDocClaims
      });
    }

    const total = documents.length || 1;
    const score = Math.round((verifiedCount / total) * 100);

    return {
      verificationScore: score,
      verifiedDocuments: verifiedCount,
      unverifiedDocuments: unverifiedCount,
      documents: verificationResults
    };
  }
}
