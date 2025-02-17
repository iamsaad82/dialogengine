import { medicalValidators } from '../../../src/lib/validation/medical';

describe('Medical Validators', () => {
  describe('validateMedications', () => {
    it('sollte gültige Medikamentenlisten akzeptieren', () => {
      const validCases = [
        'Ibuprofen',
        'Aspirin,Paracetamol',
        'Ibuprofen-600,Aspirin-500,Paracetamol'
      ];

      validCases.forEach(medications => {
        expect(medicalValidators.validateMedications(medications)).toBe(true);
      });
    });

    it('sollte ungültige Medikamentenlisten ablehnen', () => {
      const invalidCases = [
        '',
        'Ibuprofen!',
        'Aspirin@,Paracetamol',
        'Test 123'
      ];

      invalidCases.forEach(medications => {
        expect(medicalValidators.validateMedications(medications)).toBe(false);
      });
    });
  });

  describe('validateContraindications', () => {
    it('sollte gültige Kontraindikationen akzeptieren', () => {
      const validCases = [
        'Nicht anwenden bei bekannter Überempfindlichkeit.',
        'Schwere Lebererkrankungen. Niereninsuffizienz.',
        'Bei folgenden Erkrankungen nicht anwenden: Asthma, COPD.'
      ];

      validCases.forEach(contraindications => {
        expect(medicalValidators.validateContraindications(contraindications)).toBe(true);
      });
    });

    it('sollte ungültige Kontraindikationen ablehnen', () => {
      const invalidCases = [
        '',
        'Kurz',
        'Test'
      ];

      invalidCases.forEach(contraindications => {
        expect(medicalValidators.validateContraindications(contraindications)).toBe(false);
      });
    });
  });

  describe('calculateMedicalRelevance', () => {
    it('sollte höhere Relevanz für übereinstimmende Diagnosen berechnen', () => {
      const query = 'Migräne Kopfschmerzen';
      const result = {
        diagnosis: 'Migräne',
        symptoms: 'Kopfschmerzen, Übelkeit',
        treatment: 'Schmerzmittel'
      };

      const relevance = medicalValidators.calculateMedicalRelevance(query, result);
      expect(relevance).toBeGreaterThan(1.0);
    });

    it('sollte Relevanz basierend auf mehreren Faktoren berechnen', () => {
      const query = 'Kopfschmerzen Behandlung';
      const result = {
        diagnosis: 'Migräne',
        symptoms: 'Kopfschmerzen',
        treatment: 'Medikamentöse Behandlung'
      };

      const relevance = medicalValidators.calculateMedicalRelevance(query, result);
      expect(relevance).toBeGreaterThan(1.0);
    });

    it('sollte Basis-Relevanz für nicht übereinstimmende Ergebnisse zurückgeben', () => {
      const query = 'Allergie';
      const result = {
        diagnosis: 'Migräne',
        symptoms: 'Kopfschmerzen',
        treatment: 'Schmerzmittel'
      };

      const relevance = medicalValidators.calculateMedicalRelevance(query, result);
      expect(relevance).toBe(1.0);
    });
  });
}); 