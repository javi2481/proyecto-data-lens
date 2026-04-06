import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  es: {
    // Navigation
    'nav.overview': 'Resumen',
    'nav.variables': 'Variables',
    'nav.correlations': 'Correlaciones',
    'nav.alerts': 'Alertas',
    'nav.compare': 'Comparar',
    'nav.reports': 'Reportes',
    'nav.settings': 'Configuración',
    
    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.logout': 'Cerrar sesión',
    'auth.loginWithGoogle': 'Continuar con Google',
    
    // Dashboard
    'dashboard.title': 'Panel de Control',
    'dashboard.upload': 'Subir archivo',
    'dashboard.dragDrop': 'Arrastra tu archivo aquí o haz clic para seleccionar',
    'dashboard.supportedFormats': 'Formatos soportados: CSV, Excel, JSON, Parquet',
    'dashboard.analyzing': 'Analizando...',
    'dashboard.noReports': 'No hay reportes aún',
    'dashboard.uploadFirst': 'Sube tu primer archivo para comenzar el análisis',
    
    // Overview
    'overview.title': 'Resumen del Dataset',
    'overview.rows': 'Filas',
    'overview.columns': 'Columnas',
    'overview.missing': 'Valores faltantes',
    'overview.duplicates': 'Filas duplicadas',
    'overview.memory': 'Memoria',
    'overview.types': 'Tipos de columna',
    
    // Variables
    'variables.title': 'Análisis de Variables',
    'variables.name': 'Nombre',
    'variables.type': 'Tipo',
    'variables.unique': 'Únicos',
    'variables.missing': 'Faltantes',
    'variables.mean': 'Media',
    'variables.std': 'Desv. Est.',
    'variables.min': 'Mín',
    'variables.max': 'Máx',
    'variables.distribution': 'Distribución',
    'variables.topValues': 'Valores más frecuentes',
    
    // Correlations
    'correlations.title': 'Matriz de Correlaciones',
    'correlations.pearson': 'Correlación de Pearson',
    'correlations.noNumeric': 'No hay suficientes columnas numéricas para calcular correlaciones',
    
    // Alerts
    'alerts.title': 'Alertas de Calidad',
    'alerts.critical': 'Crítico',
    'alerts.warning': 'Advertencia',
    'alerts.info': 'Información',
    'alerts.noAlerts': 'No se encontraron problemas de calidad',
    'alerts.missing': 'Valores faltantes',
    'alerts.duplicates': 'Duplicados',
    'alerts.cardinality': 'Cardinalidad',
    'alerts.correlation': 'Correlación alta',
    'alerts.skewness': 'Asimetría',
    'alerts.constant': 'Constante',
    
    // Tooltips
    'tooltip.skewness': '¿Qué es skewness? Mide la asimetría de la distribución. Un valor cercano a 0 indica una distribución simétrica.',
    'tooltip.kurtosis': '¿Qué es kurtosis? Mide qué tan "puntiaguda" es la distribución. Valores altos indican más outliers.',
    'tooltip.correlation': 'La correlación mide la relación lineal entre dos variables. Valores cercanos a 1 o -1 indican fuerte correlación.',
    'tooltip.missing': 'Porcentaje de valores nulos o vacíos en esta columna.',
    
    // Comparison
    'compare.title': 'Comparar Datasets',
    'compare.selectFirst': 'Seleccionar primer dataset',
    'compare.selectSecond': 'Seleccionar segundo dataset',
    'compare.run': 'Ejecutar comparación',
    'compare.added': 'Columnas agregadas',
    'compare.removed': 'Columnas eliminadas',
    'compare.changes': 'Cambios detectados',
    
    // Export
    'export.pdf': 'Exportar PDF',
    'export.share': 'Compartir link',
    'export.copied': 'Link copiado!',
    'export.proFeature': 'Función Pro',
    
    // Pricing
    'pricing.title': 'Planes',
    'pricing.free': 'Gratis',
    'pricing.pro': 'Pro',
    'pricing.team': 'Equipo',
    'pricing.month': '/mes',
    'pricing.upgrade': 'Actualizar',
    'pricing.current': 'Plan actual',
    'pricing.features.reports': 'reportes/mes',
    'pricing.features.fileSize': 'hasta {size}MB',
    'pricing.features.rows': 'hasta {rows} filas',
    'pricing.features.pdf': 'Exportar PDF',
    'pricing.features.share': 'Links compartibles',
    'pricing.features.compare': 'Comparación de datasets',
    
    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.delete': 'Eliminar',
    'common.save': 'Guardar',
    'common.close': 'Cerrar',
    'common.back': 'Volver',
  },
  en: {
    // Navigation
    'nav.overview': 'Overview',
    'nav.variables': 'Variables',
    'nav.correlations': 'Correlations',
    'nav.alerts': 'Alerts',
    'nav.compare': 'Compare',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    
    // Auth
    'auth.login': 'Log in',
    'auth.logout': 'Log out',
    'auth.loginWithGoogle': 'Continue with Google',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.upload': 'Upload file',
    'dashboard.dragDrop': 'Drag your file here or click to select',
    'dashboard.supportedFormats': 'Supported formats: CSV, Excel, JSON, Parquet',
    'dashboard.analyzing': 'Analyzing...',
    'dashboard.noReports': 'No reports yet',
    'dashboard.uploadFirst': 'Upload your first file to start analyzing',
    
    // Overview
    'overview.title': 'Dataset Overview',
    'overview.rows': 'Rows',
    'overview.columns': 'Columns',
    'overview.missing': 'Missing values',
    'overview.duplicates': 'Duplicate rows',
    'overview.memory': 'Memory',
    'overview.types': 'Column types',
    
    // Variables
    'variables.title': 'Variable Analysis',
    'variables.name': 'Name',
    'variables.type': 'Type',
    'variables.unique': 'Unique',
    'variables.missing': 'Missing',
    'variables.mean': 'Mean',
    'variables.std': 'Std Dev',
    'variables.min': 'Min',
    'variables.max': 'Max',
    'variables.distribution': 'Distribution',
    'variables.topValues': 'Top values',
    
    // Correlations
    'correlations.title': 'Correlation Matrix',
    'correlations.pearson': 'Pearson Correlation',
    'correlations.noNumeric': 'Not enough numeric columns to calculate correlations',
    
    // Alerts
    'alerts.title': 'Quality Alerts',
    'alerts.critical': 'Critical',
    'alerts.warning': 'Warning',
    'alerts.info': 'Info',
    'alerts.noAlerts': 'No quality issues found',
    'alerts.missing': 'Missing values',
    'alerts.duplicates': 'Duplicates',
    'alerts.cardinality': 'Cardinality',
    'alerts.correlation': 'High correlation',
    'alerts.skewness': 'Skewness',
    'alerts.constant': 'Constant',
    
    // Tooltips
    'tooltip.skewness': 'What is skewness? It measures the asymmetry of the distribution. A value close to 0 indicates a symmetric distribution.',
    'tooltip.kurtosis': 'What is kurtosis? It measures how "peaked" the distribution is. High values indicate more outliers.',
    'tooltip.correlation': 'Correlation measures the linear relationship between two variables. Values close to 1 or -1 indicate strong correlation.',
    'tooltip.missing': 'Percentage of null or empty values in this column.',
    
    // Comparison
    'compare.title': 'Compare Datasets',
    'compare.selectFirst': 'Select first dataset',
    'compare.selectSecond': 'Select second dataset',
    'compare.run': 'Run comparison',
    'compare.added': 'Added columns',
    'compare.removed': 'Removed columns',
    'compare.changes': 'Detected changes',
    
    // Export
    'export.pdf': 'Export PDF',
    'export.share': 'Share link',
    'export.copied': 'Link copied!',
    'export.proFeature': 'Pro feature',
    
    // Pricing
    'pricing.title': 'Plans',
    'pricing.free': 'Free',
    'pricing.pro': 'Pro',
    'pricing.team': 'Team',
    'pricing.month': '/month',
    'pricing.upgrade': 'Upgrade',
    'pricing.current': 'Current plan',
    'pricing.features.reports': 'reports/month',
    'pricing.features.fileSize': 'up to {size}MB',
    'pricing.features.rows': 'up to {rows} rows',
    'pricing.features.pdf': 'Export PDF',
    'pricing.features.share': 'Shareable links',
    'pricing.features.compare': 'Dataset comparison',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.back': 'Back',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('datalens-language');
      if (stored) return stored;
      const browserLang = navigator.language.split('-')[0];
      return browserLang === 'es' ? 'es' : 'en';
    }
    return 'es';
  });

  useEffect(() => {
    localStorage.setItem('datalens-language', language);
  }, [language]);

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['en']?.[key] || key;
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
