export class ImpactReportGenerator {
  static generate(rootSdid, changeType, classifications, docImpacts, diagramImpacts) {
    const report = {
      change: { changeType },
      rootSDID: rootSdid,
      directImpacts: [],
      dependentImpacts: [],
      transitiveImpacts: [],
      documentationImpacts: docImpacts,
      diagramImpacts: diagramImpacts,
      impactScore: 0,
      confidence: 0,
      relationshipPaths: []
    };

    let totalScore = 0;
    let totalConfidence = 0;
    let count = 0;

    for (const c of classifications) {
      if (c.impactLevel === 'DIRECT') report.directImpacts.push(c);
      else if (c.impactLevel === 'DEPENDENT') report.dependentImpacts.push(c);
      else if (c.impactLevel === 'TRANSITIVE') report.transitiveImpacts.push(c);
      else if (c.impactLevel === 'DOCUMENTATION') report.documentationImpacts.push(c);
      else if (c.impactLevel === 'DIAGRAM') report.diagramImpacts.push(c);

      report.relationshipPaths.push({ targetSdid: c.sdid, path: c.relationshipPath });
      
      totalScore += c.impactScore;
      totalConfidence += parseFloat(c.confidence);
      count++;
    }

    for (const d of docImpacts) {
      report.relationshipPaths.push({ targetSdid: d.sdid, path: d.relationshipPath });
      totalScore += d.impactScore;
      totalConfidence += d.confidence;
      count++;
    }

    for (const d of diagramImpacts) {
      report.relationshipPaths.push({ targetSdid: d.sdid, path: d.relationshipPath });
      totalScore += d.impactScore;
      totalConfidence += d.confidence;
      count++;
    }

    if (count > 0) {
      report.impactScore = Math.round(totalScore / count);
      report.confidence = Number((totalConfidence / count).toFixed(2));
    }

    return report;
  }
}
