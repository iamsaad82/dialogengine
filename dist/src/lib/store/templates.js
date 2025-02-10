import { prisma } from '../prisma';
export const defaultTemplate = {
    id: 'default',
    name: 'Neutrale Version',
    type: 'NEUTRAL',
    active: true,
    content: JSON.stringify({
        hero: {
            title: 'Wir schalten Ihre Website',
            subtitle: 'in den Dialog-Modus',
            description: 'Websites sind und bleiben das Herzstück Ihrer digitalen Präsenz. Sie bieten Ihren Besuchern die Möglichkeit, Informationen auf ihre gewohnte Art zu entdecken.'
        },
        showcase: {
            image: './showcase-default.png',
            altText: 'Dialog-AI Showcase',
            context: {
                title: '426 Artikel in 38 Kategorien durchsuchen?',
                description: 'So funktionieren Websites heute. Aber es geht auch anders:'
            }
        },
        features: [
            {
                icon: 'zap',
                title: 'Sofortige Antworten',
                description: 'Keine Wartezeiten, keine Suche - direkte Antworten auf Ihre Fragen'
            },
            {
                icon: 'clock',
                title: '24/7 Verfügbar',
                description: 'Ihr digitaler Assistent ist rund um die Uhr für Sie da'
            },
            {
                icon: 'brain',
                title: 'KI-gestützt',
                description: 'Intelligent & lernfähig für präzise Antworten'
            },
            {
                icon: 'blocks',
                title: 'Einfache Integration',
                description: 'Nahtlos in Ihre bestehende Website integriert'
            }
        ],
        callToAction: {
            title: 'Bereit für den Dialog?',
            description: 'Starten Sie jetzt mit Dialog-AI und verwandeln Sie Ihre Website in eine interaktive Plattform.',
            primaryButton: {
                text: 'Jetzt Demo starten',
                url: '/demo'
            }
        }
    }),
    branding: JSON.stringify({
        logo: './logo.png',
        primaryColor: '#4F46E5',
        secondaryColor: '#7C3AED'
    }),
    bot: JSON.stringify({
        type: 'examples',
        examples: [
            {
                question: 'Was ist Dialog-AI?',
                answer: 'Dialog-AI ist eine innovative Chatbot-Lösung, die Ihre Website in einen interaktiven Dialog verwandelt.',
                context: 'Allgemeine Produktbeschreibung',
                type: 'info'
            }
        ]
    }),
    meta: JSON.stringify({
        title: 'Dialog-AI | Ihre Website im Dialog-Modus',
        description: 'Verwandeln Sie Ihre Website in einen interaktiven Dialog. Mit Dialog-AI bieten Sie Ihren Besuchern eine neue Art der Informationssuche.'
    })
};
export const smgTemplate = {
    id: 'smg',
    name: 'Social Media Marketing Center',
    type: 'INDUSTRY',
    active: true,
    subdomain: 'smg',
    content: JSON.stringify({
        hero: {
            title: 'Unsere Leistungen für',
            subtitle: 'Ihr Center.',
            description: 'So steigern wir die Interaktion mit Ihren Kunden'
        },
        showcase: {
            image: './smg-complex.jpg',
            altText: 'Social Media Marketing Complex Illustration',
            context: {
                title: 'Social Media Marketing für Shopping Center',
                description: 'So funktionieren Websites heute. Aber es geht auch anders:'
            }
        },
        features: [
            {
                icon: 'zap',
                title: 'Social Media Marketing',
                description: 'Professionelle Betreuung Ihrer Social Media Kanäle'
            },
            {
                icon: 'brain',
                title: 'Content Kreation',
                description: 'Kreative und ansprechende Inhalte für Ihre Zielgruppe'
            },
            {
                icon: 'blocks',
                title: 'Content Akquisition',
                description: 'Strategische Gewinnung von relevantem Content'
            },
            {
                icon: 'clock',
                title: 'Suchmaschinenoptimierung',
                description: 'Optimale Sichtbarkeit in den Suchergebnissen'
            }
        ],
        callToAction: {
            title: 'Ihr Social Media Marketing auf dem nächsten Level',
            description: 'Steigern Sie die Interaktion mit Ihren Kunden durch intelligente Dialoge.',
            primaryButton: {
                text: 'Beratungsgespräch vereinbaren',
                url: '/kontakt'
            }
        }
    }),
    branding: JSON.stringify({
        logo: './logo.png',
        primaryColor: '#DC2626',
        secondaryColor: '#4F46E5'
    }),
    bot: JSON.stringify({
        type: 'examples',
        examples: [
            {
                question: 'Welche Social Media Leistungen bieten Sie an?',
                answer: 'Wir bieten ein umfassendes Social Media Marketing an, das Content Kreation, Akquisition und Suchmaschinenoptimierung umfasst.',
                context: 'Leistungsbeschreibung',
                type: 'info'
            }
        ]
    }),
    meta: JSON.stringify({
        title: 'Social Media Marketing Center | Dialog-AI',
        description: 'Professionelles Social Media Marketing für Ihr Center. Steigern Sie die Interaktion mit Ihren Kunden durch unsere umfassenden Leistungen.'
    })
};
export const aokTemplate = {
    id: 'aok',
    name: 'AOK',
    type: 'INDUSTRY',
    active: true,
    subdomain: 'aok',
    content: JSON.stringify({
        hero: {
            title: 'Wir schalten Ihre Webseite in den Dialog-Modus.',
            subtitle: 'Schluss mit langem Suchen',
            description: 'Ihre Website ist das Herzstück Ihrer digitalen Präsenz. Wir machen sie noch wertvoller - durch intelligente Dialogführung.'
        },
        showcase: {
            image: './aok-showcase.jpg',
            altText: 'AOK Gesundheitsberatung im Einsatz',
            context: {
                title: 'Persönliche Beratung trifft KI',
                description: 'Unser digitaler Assistent kombiniert das umfassende Gesundheitswissen der AOK mit modernster KI-Technologie.'
            }
        },
        features: [
            {
                icon: 'brain',
                title: 'Natürliche Kommunikation',
                description: 'Nutzer können in ihrer eigenen Sprache Fragen stellen und bekommen präzise Antworten.'
            },
            {
                icon: 'zap',
                title: 'Schnelle Informationsfindung',
                description: 'Direkte Antworten statt langes Suchen: Der Dialog-Modus findet relevante Inhalte in Sekundenschnelle.'
            }
        ],
        callToAction: {
            title: 'Testen Sie die AOK-Gesundheitsberatung',
            description: 'Erleben Sie selbst, wie einfach und intuitiv die Suche nach Gesundheitsinformationen sein kann.',
            primaryButton: {
                text: 'Zur Gesundheitsberatung',
                url: '/beratung'
            }
        }
    }),
    branding: JSON.stringify({
        logo: './aok-logo.png',
        primaryColor: '#005e3f',
        secondaryColor: '#004730'
    }),
    bot: JSON.stringify({
        type: 'examples',
        examples: [
            {
                question: 'Welche Online-Gesundheitschecks gibt es?',
                answer: 'Die AOK bietet verschiedene Online-Gesundheitschecks an:\n• Diabetes-Risiko-Check\n• Herz-Kreislauf-Check\n• Rückengesundheits-Check\n• Stress-Check\nDiese Tests helfen Ihnen, Ihre Gesundheit besser einzuschätzen.',
                context: 'Gesundheitschecks',
                type: 'service'
            },
            {
                question: 'Was kann die AOK-App?',
                answer: 'Die AOK-App bietet viele praktische Funktionen:\n• Krankmeldung digital einreichen\n• Arzttermine verwalten\n• Bonusprogramm nutzen\n• Gesundheitskurse finden\n• Mit der AOK kommunizieren',
                context: 'AOK-App',
                type: 'product',
                metadata: {
                    buttons: [
                        {
                            text: 'Kontakt aufnehmen',
                            url: '/kontakt'
                        }
                    ]
                }
            }
        ]
    }),
    meta: JSON.stringify({
        title: 'AOK Gesundheitsberatung | Dialog-AI',
        description: 'Die intelligente Gesundheitsberatung der AOK. Finden Sie schnell und einfach Antworten auf Ihre Gesundheitsfragen.'
    })
};
export class TemplateStore {
    mapToPrismaTemplate(template) {
        const { id, createdAt, updatedAt, ...rest } = template;
        return {
            ...rest,
            type: template.type,
            subdomain: template.subdomain || null,
            content: template.content,
            branding: template.branding,
            bot: template.bot,
            meta: template.meta
        };
    }
    mapFromPrismaTemplate(template) {
        return {
            ...template,
            type: template.type,
            subdomain: template.subdomain || undefined,
            content: JSON.stringify(template.content),
            branding: JSON.stringify(template.branding),
            bot: JSON.stringify(template.bot),
            meta: JSON.stringify(template.meta)
        };
    }
    async findById(id) {
        const template = await prisma.template.findUnique({
            where: { id }
        });
        return template ? this.mapFromPrismaTemplate(template) : null;
    }
    async findBySubdomain(subdomain) {
        const template = await prisma.template.findUnique({
            where: { subdomain }
        });
        return template ? this.mapFromPrismaTemplate(template) : null;
    }
    async create(data) {
        const prismaData = this.mapToPrismaTemplate(data);
        const template = await prisma.template.create({
            data: prismaData
        });
        return this.mapFromPrismaTemplate(template);
    }
    async update(id, data) {
        const prismaData = this.mapToPrismaTemplate(data);
        const template = await prisma.template.update({
            where: { id },
            data: prismaData
        });
        return this.mapFromPrismaTemplate(template);
    }
    async delete(id) {
        await prisma.template.delete({
            where: { id }
        });
    }
}
export const templateStore = new TemplateStore();
