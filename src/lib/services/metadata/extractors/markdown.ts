import { MetadataExtractor } from '../types/base'
import { EnhancedMetadata } from '../types/enhanced'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { visit } from 'unist-util-visit'

/**
 * Markdown-Extraktor Implementierung
 */
export class MarkdownExtractor implements MetadataExtractor<EnhancedMetadata> {
  async extract(content: string): Promise<EnhancedMetadata> {
    const metadata: EnhancedMetadata = {
      id: this.generateId(),
      type: 'info',
      title: '',
      description: '',
      lastUpdated: new Date().toISOString(),
      language: 'de',
      media: {},
      interactions: {},
      structure: {
        sections: [],
        lists: []
      },
      relations: {
        internalLinks: [],
        externalLinks: []
      }
    }

    // Parse Markdown
    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter)

    const tree = await processor.parse(content)

    // Extrahiere Metadaten
    await this.extractTitle(tree, metadata)
    await this.extractMedia(tree, metadata)
    await this.extractStructure(tree, metadata)
    await this.extractLinks(tree, metadata)
    await this.extractInteractions(tree, metadata)

    return metadata
  }

  private async extractTitle(tree: any, metadata: EnhancedMetadata): Promise<void> {
    visit(tree, 'heading', (node: any) => {
      if (node.depth === 1 && !metadata.title) {
        metadata.title = this.nodeToText(node)
      }
    })
  }

  private async extractMedia(tree: any, metadata: EnhancedMetadata): Promise<void> {
    metadata.media.images = []
    metadata.media.videos = []
    metadata.media.documents = []

    visit(tree, 'image', (node: any) => {
      metadata.media.images?.push({
        type: 'image',
        url: node.url,
        title: node.alt || '',
        context: this.determineContext(node)
      })
    })

    // Video-Links erkennen
    visit(tree, 'link', (node: any) => {
      const url = node.url.toLowerCase()
      if (url.includes('youtube.com') || url.includes('vimeo.com')) {
        metadata.media.videos?.push({
          type: 'video',
          url: node.url,
          title: this.nodeToText(node),
          context: 'content'
        })
      }
    })
  }

  private async extractStructure(tree: any, metadata: EnhancedMetadata): Promise<void> {
    let currentSection: any = null

    visit(tree, (node: any) => {
      if (node.type === 'heading') {
        currentSection = {
          type: 'section',
          title: this.nodeToText(node),
          content: '',
          level: node.depth
        }
        metadata.structure.sections.push(currentSection)
      } 
      else if (node.type === 'list') {
        metadata.structure.lists.push({
          type: 'list',
          content: this.extractListItems(node),
          context: currentSection?.title
        })
      }
    })
  }

  private async extractLinks(tree: any, metadata: EnhancedMetadata): Promise<void> {
    visit(tree, 'link', (node: any) => {
      const url = node.url
      const text = this.nodeToText(node)
      
      if (this.isInternalLink(url)) {
        metadata.relations.internalLinks.push({
          text,
          path: url,
          context: this.determineContext(node)
        })
      } else {
        metadata.relations.externalLinks.push({
          text,
          url,
          context: this.determineContext(node)
        })
      }
    })
  }

  private async extractInteractions(tree: any, metadata: EnhancedMetadata): Promise<void> {
    metadata.interactions.buttons = []
    metadata.interactions.links = []

    visit(tree, 'link', (node: any) => {
      const classes = node.data?.hProperties?.className || []
      
      if (classes.includes('button')) {
        metadata.interactions.buttons?.push({
          type: 'button',
          text: this.nodeToText(node),
          url: node.url,
          context: this.determineContext(node)
        })
      }
    })
  }

  // Hilfsfunktionen
  private generateId(): string {
    return `md_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private nodeToText(node: any): string {
    let text = ''
    visit(node, 'text', (textNode: any) => {
      text += textNode.value
    })
    return text
  }

  private extractListItems(node: any): string[] {
    const items: string[] = []
    visit(node, 'listItem', (item: any) => {
      items.push(this.nodeToText(item))
    })
    return items
  }

  private isInternalLink(url: string): boolean {
    return url.startsWith('./') || url.startsWith('../') || url.startsWith('/')
  }

  private determineContext(node: any): string {
    // Implementierung der Kontext-Erkennung
    return 'content'
  }

  async validate(metadata: EnhancedMetadata): Promise<boolean> {
    // Basis-Validierung
    if (!metadata.id || !metadata.title) {
      return false
    }

    // Struktur-Validierung
    if (!metadata.structure.sections || !metadata.structure.lists) {
      return false
    }

    return true
  }
} 