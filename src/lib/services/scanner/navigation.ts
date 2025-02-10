import { CheerioAPI, CheerioSelector, CheerioElement } from '../../types/cheerio'
import { MenuItem } from '../../types/scanner'
import { NavigationExtractor, ExtractorResult } from './types'

export class NavigationExtractorImpl implements NavigationExtractor {
  private readonly navigationSelectors = {
    mainMenu: [
      'nav.main-menu',
      'nav.primary-menu',
      'nav.main-navigation',
      '#main-menu',
      '#primary-menu',
      'header nav'
    ],
    subMenu: [
      '.sub-menu',
      '.dropdown-menu',
      '.submenu',
      '.child-menu'
    ],
    breadcrumb: [
      '.breadcrumb',
      '.breadcrumbs',
      'nav[aria-label="breadcrumb"]',
      '[itemtype="http://schema.org/BreadcrumbList"]'
    ],
    search: [
      'form[role="search"]',
      '.search-form',
      '#search'
    ],
    social: [
      '.social-links',
      '.social-media',
      '.social-icons'
    ],
    language: [
      '[lang]',
      'html[lang]',
      'meta[property="og:locale"]'
    ]
  }

  private readonly socialPlatforms = {
    facebook: /facebook\.com/i,
    twitter: /twitter\.com|x\.com/i,
    linkedin: /linkedin\.com/i,
    instagram: /instagram\.com/i,
    youtube: /youtube\.com/i,
    github: /github\.com/i
  }

  async extractMainMenu($: CheerioAPI): Promise<ExtractorResult<MenuItem[]>> {
    try {
      const mainMenuSelector = this.navigationSelectors.mainMenu.find(selector => 
        $(selector).length > 0
      ) || this.navigationSelectors.mainMenu[0]

      const menu: MenuItem[] = []
      const mainMenuItems = $(mainMenuSelector).find('li').filter((_, el) => {
        return $(el).parents('li').length === 0
      })

      mainMenuItems.each((_index: number, element: CheerioElement) => {
        const $item = $(element)
        const $link = $item.find('a').first()
        const href = $link.attr('href')
        const title = $link.text().trim()

        if (!title || !href) return

        const menuItem: MenuItem = {
          title,
          url: href,
          type: this.determineLinkType(href),
          icon: this.extractIcon($, $link),
          description: $link.attr('title') || $link.attr('aria-label'),
          isActive: $item.hasClass('active') || $item.hasClass('current'),
          attributes: this.extractAttributes($link),
          children: this.extractSubItems($, $item)
        }

        menu.push(menuItem)
      })

      return { success: true, data: menu }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren des Hauptmenüs'
      }
    }
  }

  private extractAttributes($element: CheerioSelector): MenuItem['attributes'] {
    const element = $element.toArray()[0] as CheerioElement
    if (!element) return {}
    
    return {
      target: (element.attribs?.target as '_blank' | '_self') || undefined,
      rel: element.attribs?.rel,
      class: element.attribs?.class,
      id: element.attribs?.id
    }
  }

  private determineLinkType(url: string): MenuItem['type'] {
    if (url.startsWith('http') || url.startsWith('//')) return 'external'
    if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i)) return 'download'
    return 'internal'
  }

  private extractIcon($: CheerioAPI, $element: CheerioSelector): string | undefined {
    const $icon = $element.find('i, .icon, svg')
    if ($icon.length === 0) return undefined

    const iconClass = $icon.attr('class')
    if (iconClass) return iconClass

    const iconSvg = $icon.html()
    return iconSvg || undefined
  }

  private extractSubItems($: CheerioAPI, $parent: CheerioSelector): MenuItem[] {
    const items: MenuItem[] = []
    const subMenuSelector = this.navigationSelectors.subMenu.find(selector =>
      $parent.find(selector).length > 0
    ) || 'ul'

    const subItems = $parent.find(`${subMenuSelector} > li`)
    subItems.each((_index: number, element: CheerioElement) => {
      const $item = $(element)
      const $link = $item.find('a').first()
      const href = $link.attr('href')
      const title = $link.text().trim()

      // Ignoriere leere oder ungültige Menüpunkte
      if (!title || !href?.startsWith('/') && !href?.startsWith('http')) {
        return
      }

      items.push({
        title,
        url: href,
        children: this.extractSubItems($, $item)
      })
    })

    return items
  }

  async extractSubMenus($: CheerioAPI): Promise<ExtractorResult<Record<string, {
    id: string
    title?: string
    description?: string
    items: MenuItem[]
    position?: 'header' | 'footer' | 'sidebar'
  }>>> {
    try {
      const subMenus: Record<string, {
        id: string
        title?: string
        description?: string
        items: MenuItem[]
        position?: 'header' | 'footer' | 'sidebar'
      }> = {}
      
      this.navigationSelectors.subMenu.forEach(selector => {
        $(selector).each((_index: number, element: CheerioElement) => {
          const $menu = $(element)
          const id = $menu.attr('id') || $menu.attr('data-menu-id') || 
                    $menu.closest('[id]').attr('id') || `submenu_${_index}`
          
          const position = this.determineMenuPosition($, $menu)
          const title = $menu.attr('aria-label') || 
                       $menu.prev('h2,h3,h4').text().trim() ||
                       $menu.closest('section').find('h2,h3,h4').first().text().trim()
          
          const description = $menu.attr('aria-description') ||
                            $menu.find('.description').text().trim()

          const items = this.extractSubItems($, $menu)
          if (items.length > 0) {
            subMenus[id] = {
              id,
              title,
              description,
              items,
              position
            }
          }
        })
      })

      return { success: true, data: subMenus }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Untermenüs'
      }
    }
  }

  private determineMenuPosition($: CheerioAPI, $menu: CheerioSelector): 'header' | 'footer' | 'sidebar' | undefined {
    if ($menu.closest('header').length > 0) return 'header'
    if ($menu.closest('footer').length > 0) return 'footer'
    if ($menu.closest('aside, [role="complementary"]').length > 0) return 'sidebar'
    return undefined
  }

  async extractBreadcrumbs($: CheerioAPI): Promise<ExtractorResult<Record<string, {
    path: string[]
    urls?: string[]
    current: string
    schema?: {
      '@type': 'BreadcrumbList'
      itemListElement: Array<{
        '@type': 'ListItem'
        position: number
        name: string
        item: string
      }>
    }
  }>>> {
    try {
      const breadcrumbs: Record<string, {
        path: string[]
        urls?: string[]
        current: string
        schema?: any
      }> = {}
      
      const breadcrumbSelector = this.navigationSelectors.breadcrumb.find(selector =>
        $(selector).length > 0
      ) || this.navigationSelectors.breadcrumb[0]

      $(breadcrumbSelector).each((_index: number, element: CheerioElement) => {
        const $crumb = $(element)
        const path: string[] = []
        const urls: string[] = []

        if ($crumb.is('[itemtype="http://schema.org/BreadcrumbList"]')) {
          const schema = {
            '@type': 'BreadcrumbList',
            itemListElement: [] as Array<{
              '@type': 'ListItem'
              position: number
              name: string
              item: string
            }>
          }

          $crumb.find('[itemtype="http://schema.org/ListItem"]').each((index, item) => {
            const $item = $(item)
            const name = $item.find('[itemprop="name"]').text().trim()
            const url = $item.find('[itemprop="item"]').attr('href') || ''
            
            path.push(name)
            urls.push(url)
            schema.itemListElement.push({
              '@type': 'ListItem',
              position: index + 1,
              name,
              item: url
            })
          })

          if (path.length > 0) {
            breadcrumbs[path[path.length - 1]] = {
              path,
              urls,
              current: path[path.length - 1],
              schema
            }
          }
        } else {
          $crumb.find('a, span').each((_i, item) => {
            const $item = $(item)
            const text = $item.text().trim()
            const url = $item.is('a') ? $item.attr('href') : undefined

            if (text && !text.match(/^[>/|→]+$/)) {
              path.push(text)
              if (url) urls.push(url)
            }
          })

          if (path.length > 0) {
            breadcrumbs[path[path.length - 1]] = {
              path,
              urls: urls.length > 0 ? urls : undefined,
              current: path[path.length - 1]
            }
          }
        }
      })

      return { success: true, data: breadcrumbs }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Breadcrumbs'
      }
    }
  }

  async detectNavigationType($: CheerioAPI): Promise<ExtractorResult<{
    type: 'standard' | 'mega-menu' | 'sidebar' | 'hamburger'
    features: string[]
  }>> {
    try {
      const features: string[] = []
      let type: 'standard' | 'mega-menu' | 'sidebar' | 'hamburger' = 'standard'

      // Erkennung von Mega-Menüs
      if ($('.mega-menu, [class*="mega-menu"]').length > 0 ||
          $('nav').find('div.dropdown').filter((_, el) => $(el).find('ul').length >= 3).length > 0) {
        type = 'mega-menu'
        features.push('multi-column')
      }

      // Erkennung von Sidebar-Navigation
      if ($('aside nav, [role="complementary"] nav').length > 0) {
        type = 'sidebar'
        features.push('vertical-layout')
      }

      // Erkennung von Hamburger-Menüs
      if ($('.hamburger, .menu-toggle, [aria-label="Menu"], button[aria-expanded]').length > 0) {
        type = 'hamburger'
        features.push('responsive')
      }

      // Zusätzliche Features erkennen
      if ($('nav .dropdown, nav .submenu').length > 0) features.push('dropdown')
      if ($('nav').find('img, svg, .icon').length > 0) features.push('icons')
      if ($('[aria-expanded]').length > 0) features.push('expandable')
      if ($('nav').find('form').length > 0) features.push('search-integrated')

      return {
        success: true,
        data: { type, features }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler bei der Navigation-Typ-Erkennung'
      }
    }
  }

  async extractMetaNavigation($: CheerioAPI): Promise<ExtractorResult<{
    language?: string
    search?: {
      enabled: boolean
      placeholder?: string
      action?: string
    }
    social?: Array<{
      platform: string
      url: string
      icon?: string
    }>
  }>> {
    try {
      // Sprache extrahieren
      const language = $('html').attr('lang') ||
                      $('meta[property="og:locale"]').attr('content')?.split('_')[0]

      // Suche extrahieren
      const $searchForm = $(this.navigationSelectors.search.join(', ')).first()
      const search = $searchForm.length > 0 ? {
        enabled: true,
        placeholder: $searchForm.find('input[type="search"]').attr('placeholder'),
        action: $searchForm.attr('action')
      } : undefined

      // Social Media Links extrahieren
      const social: Array<{
        platform: string
        url: string
        icon?: string
      }> = []

      $(this.navigationSelectors.social.join(', ')).find('a').each((_i, element) => {
        const $link = $(element)
        const url = $link.attr('href')
        if (!url) return

        const platform = Object.entries(this.socialPlatforms).find(([_, regex]) => 
          regex.test(url)
        )?.[0]

        if (platform) {
          social.push({
            platform,
            url,
            icon: this.extractIcon($, $link)
          })
        }
      })

      return {
        success: true,
        data: {
          language,
          search,
          social: social.length > 0 ? social : undefined
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren der Meta-Navigation'
      }
    }
  }
} 