import crypto from 'crypto';
import { ImpactGraphTraversal } from './impactGraphTraversal.js';
import { ImpactClassifier } from './impactClassifier.js';
import { DocumentationImpactAnalyzer } from './documentationImpactAnalyzer.js';
import { DiagramImpactAnalyzer } from './diagramImpactAnalyzer.js';
import { ImpactReportGenerator } from './impactReportGenerator.js';
import { getMongoStatus } from '../db/mongo.js';
import { ImpactAnalysis, ImpactEntity, ImpactRelationshipPath } from '../models/ImpactModels.js';
import { db } from '../db/store.js';

export class ImpactAnalyzer {
  static async analyzeImpact(repositoryId, rootSdid, changeType, commitHash) {
    // 1. Traverse Graph
    const visitedMap = await ImpactGraphTraversal.traverse(repositoryId, rootSdid);
    
    // Extract set of all affected SDIDs
    const affectedSdids = new Set(visitedMap.keys());
    
    // 2. Classify node impacts
    const classifications = ImpactClassifier.generateClassifications(rootSdid, visitedMap);
    
    // 3. Find Documentation Impacts
    const docImpacts = await DocumentationImpactAnalyzer.findDocumentationImpacts(repositoryId, affectedSdids);
    
    // 4. Find Diagram Impacts
    const diagramImpacts = await DiagramImpactAnalyzer.findDiagramImpacts(repositoryId, affectedSdids);
    
    // 5. Generate Report
    const report = ImpactReportGenerator.generate(rootSdid, changeType, classifications, docImpacts, diagramImpacts);
    
    // 6. Save Analysis
    const analysisId = `analysis_${crypto.randomBytes(4).toString('hex')}`;
    report.analysisId = analysisId;
    
    await this.saveAnalysis(repositoryId, analysisId, rootSdid, changeType, commitHash, report);
    
    return report;
  }

  static async saveAnalysis(repositoryId, analysisId, rootSdid, changeType, commitHash, report) {
    if (getMongoStatus().isConnected) {
      try {
        await ImpactAnalysis.create({
          analysisId, repositoryId, rootSDID: rootSdid, changeType, commitHash,
          impactScore: report.impactScore, confidence: report.confidence
        });

        const allEntities = [
          ...report.directImpacts, ...report.dependentImpacts, ...report.transitiveImpacts,
          ...report.documentationImpacts, ...report.diagramImpacts
        ];

        if (allEntities.length > 0) {
          await ImpactEntity.insertMany(allEntities.map(e => ({
            analysisId, sdid: e.sdid, impactLevel: e.impactLevel,
            impactScore: e.impactScore, reason: e.reason, confidence: e.confidence
          })));
        }

        if (report.relationshipPaths.length > 0) {
          await ImpactRelationshipPath.insertMany(report.relationshipPaths.map(p => ({
            analysisId, targetSdid: p.targetSdid, path: p.path
          })));
        }
      } catch (err) {
        console.warn('MongoDB save error in ImpactAnalyzer:', err.message);
      }
    }

    if (!db.impactAnalyses) db.impactAnalyses = [];
    db.impactAnalyses.push({ analysisId, repositoryId, report });
  }

  static async getAnalysis(repositoryId, analysisId) {
    if (getMongoStatus().isConnected) {
      try {
        const analysis = await ImpactAnalysis.findOne({ analysisId, repositoryId }).lean();
        if (analysis) {
          const entities = await ImpactEntity.find({ analysisId }).lean();
          const paths = await ImpactRelationshipPath.find({ analysisId }).lean();
          
          return {
            analysisId,
            rootSDID: analysis.rootSDID,
            changeType: analysis.changeType,
            impactScore: analysis.impactScore,
            confidence: analysis.confidence,
            entities,
            relationshipPaths: paths
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    const found = (db.impactAnalyses || []).find(a => a.analysisId === analysisId && a.repositoryId === repositoryId);
    return found ? found.report : null;
  }
}
