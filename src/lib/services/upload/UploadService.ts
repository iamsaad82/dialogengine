import { DocumentAnalyzer } from '../document/DocumentAnalyzer'
import { prisma } from '@/lib/prisma'
import { HandlerConfig } from '@/lib/types/handler'
import { TemplateConfig } from '@/lib/types/template'
import { UploadJob, UploadJobMetadata, UploadJobStatus } from '@/lib/types/upload'
import { ContentTypeRegistry } from '@/lib/types/contentTypes'
import { nanoid } from 'nanoid'
import { ContentType } from '@/lib/types/contentTypes'
import { BaseContentTypes } from '@/lib/types/contentTypes'
import { BaseContentType } from '@/lib/types/contentTypes'
import { DocumentPattern, MetadataDefinition } from '@/lib/types/common'

interface UploadResult {
  templateId: string
  handlerId: string
  industry: string
  status: 'success' | 'error'
  message?: string
}

export class UploadService {
  private analyzer: DocumentAnalyzer

  constructor(config: { openaiApiKey: string, registry: ContentTypeRegistry }) {
    this.analyzer = new DocumentAnalyzer(config)
  }

  async processUpload(files: File[], templateId?: string): Promise<UploadResult> {
    try {
      console.log('🚀 Starte Upload-Verarbeitung...', { 
        filesCount: files.length, 
        templateId,
        fileNames: files.map(f => f.name)
      });
      
      // Extrahiere Text aus allen Dokumenten
      console.log('📄 Extrahiere Text aus Dokumenten...');
      const contents = await Promise.all(files.map(async file => {
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        console.log(`✓ Text extrahiert aus ${file.name} (${text.length} Zeichen)`);
        return text;
      }));
      
      // Analysiere jeden Content-Block
      console.log('🔍 Starte Dokumentenanalyse...');
      const analyses = await Promise.all(
        contents.map(async (content, index) => {
          console.log(`Analysiere Dokument ${index + 1}/${contents.length}...`);
          const analysis = await this.analyzer.analyzeDocument(content);
          console.log(`✓ Analyse für Dokument ${index + 1} abgeschlossen:`, {
            type: analysis.type,
            confidence: analysis.confidence,
            patterns: analysis.patterns.length,
            metadata: analysis.metadata
          });
          return analysis;
        })
      );
      
      // Kombiniere die Analysen
      console.log('🔄 Kombiniere Analysen...');
      const combinedAnalysis = {
        industry: analyses[0]?.metadata?.domain || 'unknown',
        confidence: analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / analyses.length,
        patterns: analyses.flatMap(a => a.patterns || []),
        metadata: {
          domain: analyses[0]?.metadata?.domain,
          subDomain: analyses[0]?.metadata?.subDomain,
          keywords: [...new Set(analyses.flatMap(a => a.metadata?.keywords || []))],
          requirements: [...new Set(analyses.flatMap(a => a.metadata?.requirements || []))],
          provider: analyses[0]?.metadata?.provider,
          coverage: [...new Set(analyses.flatMap(a => a.metadata?.coverage || []))],
          contactPoints: analyses.flatMap(a => a.metadata?.contactPoints || [])
        }
      };

      console.log('📊 Kombinierte Analyse:', {
        industry: combinedAnalysis.industry,
        confidence: combinedAnalysis.confidence,
        patternCount: combinedAnalysis.patterns.length,
        metadata: combinedAnalysis.metadata
      });

      // Erstelle oder aktualisiere Template
      console.log('💾 Speichere Template...');
      const template = await this.createOrUpdateTemplate(
        templateId,
        combinedAnalysis.industry
      );
      console.log('✓ Template gespeichert:', {
        id: template.id,
        name: template.name,
        type: template.type
      });

      // Erstelle Handler-Konfiguration basierend auf der Analyse
      console.log('⚙️ Erstelle Handler-Konfiguration...');
      
      // Nutze die Analyse-Ergebnisse für den Content-Type
      const analysis = analyses[0]; // Erste Analyse als Basis
      console.log('📊 Analyse-Ergebnis für Handler:', {
        type: analysis.type,
        confidence: analysis.confidence,
        metadata: analysis.metadata
      });

      // Verwende den von der AI erkannten Content-Type direkt
      const contentType = analysis.type as BaseContentType;

      const handlerConfig = {
        id: nanoid(),
        type: contentType,
        name: `${analysis.metadata.classification?.type || 'Default'}-${analysis.metadata.classification?.purpose || 'General'}-Handler`,
        active: true,
        capabilities: [
          'content-detection',
          'metadata-extraction',
          'pattern-matching',
          analysis.metadata.requirements?.length ? 'requirements-detection' : null,
          analysis.metadata.coverage?.length ? 'coverage-detection' : null,
          analysis.metadata.contactPoints?.length ? 'contact-detection' : null
        ].filter(Boolean) as string[],
        config: {
          patterns: [
            // Domain-spezifische Patterns
            {
              name: 'domain_context',
              pattern: `\\b(${analysis.metadata.domain}|${analysis.metadata.subDomain || ''})\\b`,
              required: true,
              examples: [],
              extractMetadata: ['domain', 'subDomain']
            },
            // Patterns aus der Analyse
            ...analysis.patterns.map(p => ({
              name: p.pattern,
              pattern: p.pattern,
              required: false,
              examples: p.matches || [],
              extractMetadata: ['content', 'context']
            }))
          ],
          metadata: {
            domain: { 
              name: 'Domain',
              type: 'string',
              required: true
            } as MetadataDefinition,
            subDomain: { 
              name: 'Sub-Domain',
              type: 'string',
              required: false
            } as MetadataDefinition,
            requirements: { 
              name: 'Requirements',
              type: 'string[]',
              required: false
            } as MetadataDefinition,
            coverage: { 
              name: 'Coverage',
              type: 'string[]',
              required: false
            } as MetadataDefinition,
            provider: { 
              name: 'Provider',
              type: 'string',
              required: false
            } as MetadataDefinition,
            contactPoints: { 
              name: 'Contact Points',
              type: 'object',
              required: false
            } as MetadataDefinition
          },
          settings: {
            matchThreshold: 0.8,
            contextWindow: 1000,
            maxTokens: 2000,
            dynamicResponses: true,
            includeLinks: true,
            includeContact: true,
            includeSteps: true,
            includePrice: true,
            includeAvailability: true,
            useExactMatches: false
          }
        },
        metadata: {
          generated: true,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          industry: analysis.metadata.domain,
          category: analysis.metadata.subDomain,
          confidence: analysis.confidence,
          domain: analysis.metadata.domain,
          subDomain: analysis.metadata.subDomain,
          provider: analysis.metadata.provider
        }
      } as HandlerConfig;

      // Erstelle Handler
      console.log('💾 Speichere Handler...', handlerConfig);
      const handler = await prisma.template_handlers.create({
        data: {
          id: handlerConfig.id,
          templateId: template.id,
          type: handlerConfig.type,
          name: handlerConfig.name,
          active: handlerConfig.active,
          config: JSON.stringify(handlerConfig.config),
          metadata: JSON.stringify(handlerConfig.metadata)
        }
      });

      console.log('✓ Handler gespeichert:', { 
        id: handler.id,
        type: handler.type,
        name: handler.name,
        templateId: template.id
      });

      // Verarbeite und indexiere Dokumente
      console.log('📑 Verarbeite und indexiere Dokumente...');
      await this.processAndIndexDocuments(
        files,
        template.id,
        handler.id,
        true
      );
      console.log('✅ Dokumente verarbeitet und indexiert');

      return {
        templateId: template.id,
        handlerId: handler.id,
        industry: combinedAnalysis.industry,
        status: 'success'
      }
    } catch (error) {
      console.error('❌ Upload-Verarbeitungsfehler:', error)
      return {
        templateId: '',
        handlerId: '',
        industry: '',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private determineContentType(domain: string): BaseContentType {
    console.log('🔍 Bestimme Content-Type für Domain:', domain);
    
    const domainMap: Record<string, BaseContentType> = {
      'Gesundheit': BaseContentTypes.SERVICE,
      'Bildung': BaseContentTypes.SERVICE,
      'Finanzen': BaseContentTypes.SERVICE,
      'Produkte': BaseContentTypes.PRODUCT,
      'Veranstaltungen': BaseContentTypes.EVENT,
      'default': BaseContentTypes.SERVICE
    };
    
    const contentType = domainMap[domain] || domainMap.default;
    console.log('✓ Content-Type bestimmt:', contentType);
    
    return contentType;
  }

  private async createOrUpdateTemplate(
    existingId: string | undefined,
    industry: string
  ) {
    const templateData = {
      name: `${industry}-Template`,
      type: 'auto-generated',
      active: true,
      bot_type: 'template-handler',
      bot_config: {
        type: 'template-handler',
        config: {
          handlers: [],
          settings: {
            useMarkdown: true,
            formatDates: true,
            includeMeta: true
          }
        }
      },
      meta: {
        industry,
        generated: true,
        version: '1.0'
      }
    }

    if (existingId) {
      return prisma.template.update({
        where: { id: existingId },
        data: templateData
      })
    } else {
      return prisma.template.create({
        data: templateData
      })
    }
  }

  private async processAndIndexDocuments(
    files: File[],
    templateId: string,
    handlerId: string,
    createHandler: boolean = false
  ) {
    const initialMetadata = {
      handlerId,
      startTime: new Date().toISOString()
    }

    // Erstelle Upload-Job
    const job = await prisma.uploadJob.create({
      data: {
        id: crypto.randomUUID(),
        templateId,
        status: 'processing' as UploadJobStatus,
        totalFiles: files.length,
        processedFiles: 0,
        metadata: JSON.stringify(initialMetadata)
      }
    })

    try {
      // Verarbeite jede Datei
      for (const [index, file] of files.entries()) {
        await this.processFile(file, templateId, handlerId, createHandler)
        
        const updateMetadata = {
          ...initialMetadata,
          lastProcessedFile: file.name,
          lastUpdateTime: new Date().toISOString()
        }

        // Update Job-Status
        await prisma.uploadJob.update({
          where: { id: job.id },
          data: {
            processedFiles: index + 1,
            metadata: JSON.stringify(updateMetadata)
          }
        })
      }

      const completionMetadata = {
        ...initialMetadata,
        completionTime: new Date().toISOString(),
        totalProcessed: files.length
      }

      // Markiere Job als abgeschlossen
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: {
          status: 'completed' as UploadJobStatus,
          metadata: JSON.stringify(completionMetadata)
        }
      })
    } catch (error) {
      const errorMetadata = {
        ...initialMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorTime: new Date().toISOString()
      }

      // Markiere Job als fehlgeschlagen
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: {
          status: 'error' as UploadJobStatus,
          metadata: JSON.stringify(errorMetadata)
        }
      })
      throw error
    }
  }

  private async processFile(
    file: File,
    templateId: string,
    handlerId: string,
    createHandler: boolean = false
  ) {
    console.log(`📄 Verarbeite Datei: ${file.name}`, {
      templateId,
      handlerId,
      createHandler
    });
    
    try {
      // 1. Extrahiere Text
      console.log('📑 Extrahiere Text...');
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder().decode(buffer);
      console.log(`✓ Text extrahiert (${text.length} Zeichen)`);

      // 2. Analysiere Dokument
      console.log('🔍 Analysiere Dokument...');
      const analysis = await this.analyzer.analyzeDocument(text);
      console.log('✓ Analyse abgeschlossen:', {
        type: analysis.type,
        confidence: analysis.confidence,
        patterns: analysis.patterns.length,
        metadata: analysis.metadata
      });

      // 3. Erstelle Metadaten für das Dokument
      console.log('📝 Erstelle Dokument-Metadaten...');
      const documentMetadata = {
        filename: file.name,
        type: analysis.type,
        confidence: analysis.confidence,
        timestamp: new Date().toISOString(),
        templateId: templateId,
        handlerId: handlerId,
        ...analysis.metadata
      };
      console.log('✓ Metadaten erstellt:', documentMetadata);

      console.log('✅ Dateiverarbeitung abgeschlossen');
    } catch (error) {
      console.error('❌ Fehler bei der Dateiverarbeitung:', error);
      throw error;
    }
  }

  private createHandlerConfig(templateId: string, domain: string, analysis: any): HandlerConfig {
    // Extrahiere spezifische Patterns aus der Analyse
    const extractedPatterns = [
      // Domain-spezifische Patterns
      {
        name: 'domain_context',
        pattern: `\\b(${domain}|${analysis.metadata?.subDomain || ''})\\b`,
        required: true,
        examples: [],
        extractMetadata: ['domain', 'subDomain']
      },
      // Requirements Pattern
      {
        name: 'requirements',
        pattern: '\\b(Voraussetzung|Bedingung|erforderlich|benötigt)\\b',
        required: false,
        examples: analysis.metadata?.requirements || [],
        extractMetadata: ['requirements']
      },
      // Coverage Pattern
      {
        name: 'coverage',
        pattern: '\\b(Leistung|Umfang|beinhaltet|umfasst)\\b',
        required: false,
        examples: analysis.metadata?.coverage || [],
        extractMetadata: ['coverage']
      },
      // Contact Pattern
      {
        name: 'contact',
        pattern: '\\b(Kontakt|Ansprechpartner|Telefon|E-Mail)\\b',
        required: false,
        examples: [],
        extractMetadata: ['contactPoints']
      }
    ];

    // Füge dokumentspezifische Patterns hinzu
    const documentPatterns = analysis.patterns?.map((p: any) => ({
      name: p.pattern,
      pattern: p.pattern,
      required: false,
      examples: p.matches || [],
      extractMetadata: ['content', 'context']
    })) || [];

    // Kombiniere alle Patterns
    const allPatterns = [...extractedPatterns, ...documentPatterns];

    // Bestimme Capabilities basierend auf den verfügbaren Metadaten
    const capabilities = [
      'content-detection',
      'metadata-extraction',
      'pattern-matching',
      analysis.metadata?.requirements ? 'requirements-detection' : null,
      analysis.metadata?.coverage ? 'coverage-detection' : null,
      analysis.metadata?.contactPoints ? 'contact-detection' : null,
      analysis.metadata?.nextSteps ? 'workflow-detection' : null
    ].filter(Boolean) as string[];

    return {
      id: nanoid(),
      type: this.determineContentType(domain),
      name: `${domain}-${analysis.metadata?.subDomain || 'General'}-Handler`,
      active: true,
      capabilities,
      config: {
        patterns: allPatterns,
        metadata: {
          domain: { 
            name: 'Domain',
            type: 'string',
            required: true
          },
          subDomain: { 
            name: 'Sub-Domain',
            type: 'string',
            required: false
          },
          requirements: { 
            name: 'Requirements',
            type: 'string[]',
            required: false
          },
          coverage: { 
            name: 'Coverage',
            type: 'string[]',
            required: false
          },
          provider: { 
            name: 'Provider',
            type: 'string',
            required: false
          },
          contactPoints: { 
            name: 'Contact Points',
            type: 'object',
            required: false
          },
          nextSteps: {
            name: 'Next Steps',
            type: 'string[]',
            required: false
          }
        },
        settings: {
          matchThreshold: 0.8,
          contextWindow: 1000,
          maxTokens: 2000,
          dynamicResponses: true,
          includeLinks: true,
          includeContact: true,
          includeSteps: true,
          includePrice: true,
          includeAvailability: true,
          useExactMatches: false
        }
      },
      metadata: {
        generated: true,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        industry: analysis.metadata?.domain || domain,
        category: analysis.metadata?.subDomain || domain,
        confidence: analysis.confidence || 0,
        domain: analysis.metadata?.domain || domain,
        subDomain: analysis.metadata?.subDomain || '',
        provider: analysis.metadata?.provider || '',
        serviceType: analysis.metadata?.serviceType || ''
      }
    };
  }
} 