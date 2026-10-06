export function detectProjectType(analysis) {
  const frontend = analysis.frontend || [];
  const backend = analysis.backend || [];
  const databases = analysis.database?.databases || [];
  const packageManagers = analysis.packageManagers || [];
  const languages = analysis.languages || [];
  const hasDocker = analysis.configuration?.docker?.dockerfile;
  const hasCI = analysis.configuration?.ciCd?.githubActions || analysis.configuration?.ciCd?.gitlabCi;

  if (frontend.includes('Next.js')) {
    if (backend.length > 0) {
      return 'Next.js Full Stack';
    }
    return 'Next.js Full Stack';
  }

  if (frontend.includes('React') && backend.includes('Express') && databases.includes('MongoDB')) {
    return 'MERN Stack';
  }

  if (frontend.includes('Angular') && backend.includes('Express') && databases.includes('MongoDB')) {
    return 'MEAN Stack';
  }

  if (backend.includes('Spring Boot')) {
    return 'Spring Boot REST API';
  }

  if (backend.includes('FastAPI')) {
    return 'FastAPI Service';
  }

  if (backend.includes('Flask')) {
    return 'Flask Web App';
  }

  if (backend.includes('Django')) {
    return 'Django Web App';
  }

  if (frontend.includes('React')) {
    return 'React SPA';
  }

  if (frontend.includes('Vue')) {
    return 'Vue SPA';
  }

  if (frontend.includes('Angular')) {
    return 'Angular SPA';
  }

  if (frontend.includes('Flutter Web') || languages.includes('Dart')) {
    return 'Flutter Web App';
  }

  if (backend.includes('Laravel')) {
    return 'Laravel Web App';
  }

  if (backend.includes('ASP.NET')) {
    return 'ASP.NET Web App';
  }

  if (languages.includes('Python') && analysis.dependencies.some((dep) => ['scikit-learn', 'tensorflow', 'torch', 'pytorch', 'xgboost'].includes(dep.name.toLowerCase()))) {
    return 'AI Project';
  }

  if (analysis.deployment?.container?.docker || analysis.deployment?.container?.kubernetes) {
    return 'Microservice';
  }

  if (backend.length > 0) {
    return 'REST API';
  }

  if (frontend.length > 0) {
    return 'Full Stack Web Application';
  }

  return 'Library';
}
