export const medicalValidators = {
  validateMedications: (medications: string): boolean => {
    if (typeof medications !== 'string') return false;

    // Prüfe auf gültiges Format (Komma-separierte Liste)
    const medicationList = medications.split(',').map(m => m.trim());
    return medicationList.every(med => 
      med.length > 0 && /^[A-Za-z0-9-]+$/.test(med)
    );
  },

  validateContraindications: (contraindications: string): boolean => {
    if (typeof contraindications !== 'string') return false;

    // Prüfe auf gültiges Format und Mindestlänge
    return contraindications.length >= 10 && 
           contraindications.split('.').length >= 1;
  },

  calculateMedicalRelevance: (query: string, result: any): number => {
    let relevance = 1.0;

    // Erhöhe Relevanz basierend auf spezifischen medizinischen Kriterien
    if (result.diagnosis && query.toLowerCase().includes(result.diagnosis.toLowerCase())) {
      relevance *= 1.5;
    }

    if (result.symptoms && query.toLowerCase().includes(result.symptoms.toLowerCase())) {
      relevance *= 1.3;
    }

    if (result.treatment && query.toLowerCase().includes(result.treatment.toLowerCase())) {
      relevance *= 1.2;
    }

    return relevance;
  }
}; 