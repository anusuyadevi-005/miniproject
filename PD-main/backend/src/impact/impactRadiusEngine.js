import { db } from '../db/store.js';

export class ImpactRadiusEngine {
  /**
   * Evaluates the hierarchical impact radius of an AST code change.
   * Granularly calculates the smallest meaningful set of downstream artifacts and diagrams to regenerate.
   */
  static calculateImpactRadius(sdid, changeType = 'FUNCTION_MODIFIED', paramCountChanged = 0) {
    const mapping = (db.sdidMapping || []).find(m => m.sdid === sdid);
    const symbolName = mapping ? mapping.symbolName : (sdid.split(':').pop() || 'UnknownSymbol');

    let level = 'FUNCTION';
    let affectedScope = [];
    let updatedArtifactTypes = [];
    let affectedDiagrams = [];

    const normType = String(changeType).toUpperCase();

    if (normType.includes('DATABASE') || sdid.startsWith('sdid:db:')) {
      level = 'DATABASE_TIER';
      affectedScope = ['Database Schema', 'Entity Models', 'Dependent APIs', 'Data Flow'];
      updatedArtifactTypes = ['Database Schema', 'ER Diagram', 'Data Flow', 'API Table'];
      affectedDiagrams = ['erDiagram', 'dataFlow'];
    } else if (normType.includes('API') || normType.includes('ROUTE') || sdid.startsWith('sdid:route:')) {
      level = 'API_CONTRACT';
      affectedScope = ['API Endpoints', 'Workflow Sequence', 'Component Architecture'];
      updatedArtifactTypes = ['API Table', 'Workflow Sequence', 'Component Architecture', 'OpenAPI Spec'];
      affectedDiagrams = ['sequence', 'component'];
    } else if (normType.includes('DEPENDENCY') || sdid.startsWith('sdid:dep:')) {
      level = 'PACKAGE_TIER';
      affectedScope = ['Dependencies', 'Security Analysis', 'Deployment'];
      updatedArtifactTypes = ['Dependencies Matrix', 'Security Audit', 'Deployment Guide'];
      affectedDiagrams = ['dependencyGraph'];
    } else if (normType.includes('SECURITY') || normType.includes('CONFIG') || sdid.startsWith('sdid:config:')) {
      level = 'SECURITY_LAYER';
      affectedScope = ['Configuration', 'Security', 'Deployment'];
      updatedArtifactTypes = ['Security Audit', 'Deployment Topology'];
      affectedDiagrams = ['securityFlow', 'deployment'];
    } else if (normType.includes('DOC') || sdid.startsWith('sdid:doc:')) {
      level = 'DOCUMENTATION_ONLY';
      affectedScope = ['Documentation'];
      updatedArtifactTypes = ['README.md', 'Static Documentation'];
      affectedDiagrams = [];
    } else if (normType.includes('CLASS') || sdid.startsWith('sdid:class:')) {
      level = 'CLASS';
      affectedScope = ['Class', 'Module', 'Component Architecture'];
      updatedArtifactTypes = ['Class Overview', 'Component Architecture'];
      affectedDiagrams = ['component'];
    } else if (normType.includes('BREAKING') || paramCountChanged >= 3) {
      level = 'ARCHITECTURE';
      affectedScope = ['Function', 'Class', 'Module', 'Package', 'Architecture System'];
      updatedArtifactTypes = ['Paragraph', 'Architecture Diagram', 'API Table', 'Sequence Flow', 'README.md'];
      affectedDiagrams = ['systemContext', 'container', 'component', 'sequence'];
    } else {
      level = 'FUNCTION';
      affectedScope = ['Function', 'Unit Tests'];
      updatedArtifactTypes = ['Paragraph', 'Function Overview'];
      affectedDiagrams = [];
    }

    // Retrieve specific artifacts tagged with this SDID
    const artifactsToRegenerate = mapping && mapping.associatedArtifacts
      ? mapping.associatedArtifacts.filter(a =>
          updatedArtifactTypes.some(t => a.type && a.type.toLowerCase().includes(t.toLowerCase()))
        )
      : [];

    return {
      sdid,
      symbolName,
      changeType: normType,
      impactLevel: level,
      affectedScope,
      updatedArtifactTypes,
      affectedDiagrams,
      artifactsToRegenerate,
      explanation: `Calculated Impact Radius: [${level}]. Target: ${symbolName}. Affected diagrams: [${affectedDiagrams.join(', ') || 'None'}]. Unrelated sections remain untouched.`
    };
  }
}
