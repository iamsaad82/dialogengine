import { NavigationExtractorImpl } from '../navigation'
import * as cheerio from 'cheerio'

describe('NavigationExtractor', () => {
  let navigationExtractor: NavigationExtractorImpl
  
  beforeEach(() => {
    navigationExtractor = new NavigationExtractorImpl()
  })

  describe('extractMainMenu', () => {
    it('sollte das Hauptmenü mit verschachtelten Elementen extrahieren', async () => {
      const html = `
        <nav class="main-menu">
          <ul>
            <li>
              <a href="/services">Services</a>
              <ul>
                <li><a href="/services/health">Gesundheit</a></li>
                <li><a href="/services/insurance">Versicherung</a></li>
              </ul>
            </li>
            <li>
              <a href="/about">Über uns</a>
            </li>
          </ul>
        </nav>
      `
      const $ = cheerio.load(html)
      const menu = await navigationExtractor.extractMainMenu($)

      expect(menu).toHaveLength(2)
      expect(menu[0]).toMatchObject({
        title: 'Services',
        url: '/services',
        children: [
          {
            title: 'Gesundheit',
            url: '/services/health'
          },
          {
            title: 'Versicherung',
            url: '/services/insurance'
          }
        ]
      })
      expect(menu[1]).toMatchObject({
        title: 'Über uns',
        url: '/about'
      })
    })
  })

  describe('extractSubMenus', () => {
    it('sollte Untermenüs mit IDs extrahieren', async () => {
      const html = `
        <div class="sub-menu" id="services-menu">
          <ul>
            <li><a href="/health">Gesundheit</a></li>
            <li><a href="/insurance">Versicherung</a></li>
          </ul>
        </div>
        <div class="sub-menu" id="about-menu">
          <ul>
            <li><a href="/team">Team</a></li>
            <li><a href="/contact">Kontakt</a></li>
          </ul>
        </div>
      `
      const $ = cheerio.load(html)
      const subMenus = await navigationExtractor.extractSubMenus($)

      expect(Object.keys(subMenus)).toHaveLength(2)
      expect(subMenus['services-menu']).toEqual([
        {
          title: 'Gesundheit',
          url: '/health'
        },
        {
          title: 'Versicherung',
          url: '/insurance'
        }
      ])
      expect(subMenus['about-menu']).toEqual([
        {
          title: 'Team',
          url: '/team'
        },
        {
          title: 'Kontakt',
          url: '/contact'
        }
      ])
    })
  })

  describe('extractBreadcrumbs', () => {
    it('sollte Breadcrumb-Pfade extrahieren', async () => {
      const html = `
        <div class="breadcrumb">
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <span>Gesundheit</span>
        </div>
      `
      const $ = cheerio.load(html)
      const breadcrumbs = await navigationExtractor.extractBreadcrumbs($)

      expect(Object.keys(breadcrumbs)).toHaveLength(1)
      expect(breadcrumbs['Gesundheit']).toEqual([
        'Home',
        'Services',
        'Gesundheit'
      ])
    })

    it('sollte mehrere Breadcrumb-Pfade extrahieren', async () => {
      const html = `
        <div class="breadcrumb">
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <span>Gesundheit</span>
        </div>
        <div class="breadcrumb">
          <a href="/">Home</a>
          <a href="/about">Über uns</a>
          <span>Team</span>
        </div>
      `
      const $ = cheerio.load(html)
      const breadcrumbs = await navigationExtractor.extractBreadcrumbs($)

      expect(Object.keys(breadcrumbs)).toHaveLength(2)
      expect(breadcrumbs['Gesundheit']).toEqual([
        'Home',
        'Services',
        'Gesundheit'
      ])
      expect(breadcrumbs['Team']).toEqual([
        'Home',
        'Über uns',
        'Team'
      ])
    })
  })
}) 