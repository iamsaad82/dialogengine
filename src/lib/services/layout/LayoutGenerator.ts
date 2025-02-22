import { Layout } from './LayoutService';
import { ContentAnalysis } from '@/lib/types/upload';
import { ResponseContentTypes } from '@/lib/types/contentTypes';

export class LayoutGenerator {
  private generateTemplate(analysis: ContentAnalysis): string {
    const hasImages = analysis.metadata?.media?.images?.length > 0;
    const hasButtons = analysis.metadata?.interactive?.buttons?.length > 0;
    const hasCoverage = analysis.metadata?.coverage?.length > 0;
    const hasRequirements = analysis.metadata?.requirements?.length > 0;
    const hasNextSteps = analysis.metadata?.nextSteps?.length > 0;
    const hasContactPoints = analysis.metadata?.contactPoints?.length > 0;
    
    let template = '';
    
    // Header mit Bild wenn vorhanden
    if (hasImages) {
      template += `
        <div class="header">
          <img src="{image.url}" alt="{image.alt}" class="w-full h-64 object-cover" />
          {#if image.caption}
            <p class="text-sm text-muted-foreground mt-2">{image.caption}</p>
          {/if}
        </div>
      `;
    }
    
    // Hauptinhalt
    template += `
      <div class="content space-y-6">
        <div>
          <h1 class="text-2xl font-bold">{title}</h1>
          {#if subtitle}
            <p class="text-lg text-muted-foreground mt-2">{subtitle}</p>
          {/if}
        </div>

        <div class="description prose">{content}</div>
        
        {#if coverage}
        <div class="coverage">
          <h2 class="text-xl font-semibold mb-4">Leistungen & Angebote</h2>
          <ul class="space-y-2">
            {#each coverage as item}
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
        {/if}

        {#if requirements}
        <div class="requirements">
          <h2 class="text-xl font-semibold mb-4">Voraussetzungen</h2>
          <ul class="space-y-2">
            {#each requirements as item}
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
        {/if}

        {#if nextSteps}
        <div class="next-steps">
          <h2 class="text-xl font-semibold mb-4">Nächste Schritte</h2>
          <div class="steps space-y-4">
            {#each nextSteps as step, index}
              <div class="step flex items-start">
                <span class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-4">{index + 1}</span>
                <span>{step}</span>
              </div>
            {/each}
          </div>
        </div>
        {/if}

        {#if contactPoints}
        <div class="contact-info">
          <h2 class="text-xl font-semibold mb-4">Kontakt</h2>
          <div class="grid gap-4">
            {#each contactPoints as contact}
              <div class="contact-card p-4 border rounded-lg">
                {#if contact.type}
                  <p class="font-medium">{contact.type}</p>
                {/if}
                <p>{contact.value}</p>
                {#if contact.description}
                  <p class="text-sm text-muted-foreground mt-1">{contact.description}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
        {/if}
      </div>
    `;
    
    // Interaktive Elemente
    if (hasButtons) {
      template += `
        <div class="actions mt-8 flex flex-wrap gap-4">
          {#each buttons as button}
            <button class="btn {button.type === 'primary' ? 'btn-primary' : 'btn-secondary'}">{button.text}</button>
          {/each}
        </div>
      `;
    }
    
    return template;
  }

  private determineResponseType(analysis: ContentAnalysis): ResponseContentTypes {
    // Bestimme den ResponseType basierend auf der Analyse
    if (analysis.metadata?.media?.images?.length > 0) {
      return ResponseContentTypes.MEDIA;
    }
    
    if (analysis.metadata?.interactive?.forms?.length > 0) {
      return ResponseContentTypes.INTERACTIVE;
    }
    
    if (analysis.metadata?.coverage?.length > 0 || analysis.metadata?.requirements?.length > 0) {
      return ResponseContentTypes.STRUCTURED;
    }
    
    return ResponseContentTypes.TEXT;
  }

  public generateLayout(
    analysis: ContentAnalysis,
    handlerId: string,
    existingLayouts: Layout[] = []
  ): Layout {
    const responseType = this.determineResponseType(analysis);
    const template = this.generateTemplate(analysis);
    
    // Generiere eine eindeutige Version
    const version = Math.max(0, ...existingLayouts.map(l => l.metadata.version)) + 1;
    
    return {
      id: crypto.randomUUID(),
      name: `${analysis.metadata?.domain || 'Unbekannt'} - ${analysis.metadata?.subDomain || 'Standard'}`,
      description: `Automatisch generiertes Layout für ${analysis.metadata?.serviceType || analysis.type}`,
      config: {
        type: responseType,
        template,
        conditions: {
          requiredSchemas: [],
          requiredHandlers: [handlerId],
          contextRules: [
            analysis.metadata?.domain ? {
              field: 'domain',
              operator: 'equals',
              value: analysis.metadata.domain
            } : null,
            analysis.metadata?.subDomain ? {
              field: 'subDomain',
              operator: 'equals',
              value: analysis.metadata.subDomain
            } : null,
            analysis.metadata?.provider ? {
              field: 'provider',
              operator: 'equals',
              value: analysis.metadata.provider
            } : null
          ].filter(Boolean)
        }
      },
      metadata: {
        lastModified: new Date().toISOString(),
        version
      }
    };
  }
} 