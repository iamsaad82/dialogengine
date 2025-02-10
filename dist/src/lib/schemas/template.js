"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateSchema = exports.metaSchema = exports.botSchema = exports.smartSearchSchema = exports.brandingSchema = exports.contentSchema = exports.exampleSchema = exports.ExampleMetadataSchema = exports.metadataSchema = exports.contactSchema = exports.callToActionSchema = exports.featuresSchema = exports.showcaseSchema = exports.heroSchema = exports.featureSchema = exports.responseTypeSchema = exports.templateTypeSchema = exports.iconTypeSchema = void 0;
const zod_1 = require("zod");
// Basic types
exports.iconTypeSchema = zod_1.z.enum(['zap', 'clock', 'brain', 'blocks']);
exports.templateTypeSchema = zod_1.z.enum(['NEUTRAL', 'INDUSTRY', 'CUSTOM']);
exports.responseTypeSchema = zod_1.z.enum([
    'info',
    'service',
    'link',
    'contact',
    'product',
    'location',
    'faq',
    'event',
    'download',
    'video'
]);
// Feature schema
exports.featureSchema = zod_1.z.object({
    icon: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(500)
});
// Hero schema
exports.heroSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    subtitle: zod_1.z.string().max(300),
    description: zod_1.z.string().max(500)
});
// Showcase schema
exports.showcaseSchema = zod_1.z.object({
    image: zod_1.z.string().url(),
    altText: zod_1.z.string().max(200),
    context: zod_1.z.object({
        title: zod_1.z.string().max(200),
        description: zod_1.z.string().max(500)
    }),
    cta: zod_1.z.object({
        title: zod_1.z.string().max(200),
        question: zod_1.z.string().max(500)
    })
});
exports.featuresSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    subtitle: zod_1.z.string().max(300),
    items: zod_1.z.array(exports.featureSchema)
});
// Call to Action schema
exports.callToActionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(300),
    primaryButton: zod_1.z.object({
        text: zod_1.z.string().min(1).max(50),
        url: zod_1.z.string().url()
    })
});
// Contact schema
exports.contactSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(300),
    email: zod_1.z.string().email(),
    buttonText: zod_1.z.string().min(1).max(50)
});
// Metadata schemas
exports.metadataSchema = zod_1.z.object({
    url: zod_1.z.string().url().optional(),
    image: zod_1.z.string().url().optional(),
    price: zod_1.z.string().optional(),
    date: zod_1.z.string().datetime().optional(),
    address: zod_1.z.string().optional(),
    buttonText: zod_1.z.string().max(50).optional(),
    videoUrl: zod_1.z.string().url().optional()
});
exports.ExampleMetadataSchema = zod_1.z.object({
    url: zod_1.z.string().optional(),
    image: zod_1.z.string().optional(),
    price: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    time: zod_1.z.string().optional(),
    sessions: zod_1.z.string().optional(),
    available: zod_1.z.boolean().optional(),
    address: zod_1.z.string().optional(),
    buttonText: zod_1.z.string().optional(),
    videoUrl: zod_1.z.string().optional(),
    fileSize: zod_1.z.string().optional(),
    fileType: zod_1.z.string().optional(),
    relatedQuestions: zod_1.z.string().optional(),
    title: zod_1.z.string().optional()
});
// Example schema
exports.exampleSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.enum(['info', 'service', 'link', 'contact', 'product', 'location', 'faq', 'event', 'download', 'video']),
    question: zod_1.z.string(),
    answer: zod_1.z.string(),
    context: zod_1.z.string(),
    metadata: zod_1.z.object({
        url: zod_1.z.string().optional(),
        buttonText: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        date: zod_1.z.string().optional(),
        time: zod_1.z.string().optional(),
        sessions: zod_1.z.string().optional(),
        available: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional(),
        title: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        price: zod_1.z.string().optional(),
        fileType: zod_1.z.string().optional(),
        fileSize: zod_1.z.string().optional(),
        videoUrl: zod_1.z.string().optional(),
        relatedQuestions: zod_1.z.string().optional()
    })
});
// Main content schema
exports.contentSchema = zod_1.z.object({
    hero: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        image: zod_1.z.string(),
        altText: zod_1.z.string()
    }).optional(),
    showcase: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        image: zod_1.z.string(),
        altText: zod_1.z.string(),
        context: zod_1.z.string(),
        cta: zod_1.z.object({
            text: zod_1.z.string(),
            url: zod_1.z.string()
        })
    }).optional(),
    features: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        icon: zod_1.z.string()
    })).optional(),
    contact: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        email: zod_1.z.string(),
        buttonText: zod_1.z.string()
    }).optional(),
    dialog: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string()
    }).optional()
});
// Branding schema
exports.brandingSchema = zod_1.z.object({
    logo: zod_1.z.string().url(),
    primaryColor: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i),
    secondaryColor: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i)
});
// Smart Search schema
exports.smartSearchSchema = zod_1.z.object({
    provider: zod_1.z.literal('openai'),
    urls: zod_1.z.array(zod_1.z.string()),
    excludePatterns: zod_1.z.array(zod_1.z.string()),
    chunkSize: zod_1.z.number().min(100).max(8000),
    temperature: zod_1.z.number().min(0).max(1),
    reindexInterval: zod_1.z.number().min(1).max(168),
    maxTokensPerRequest: zod_1.z.number().min(100).max(4000),
    maxPages: zod_1.z.number().min(1).max(1000),
    useCache: zod_1.z.boolean(),
    similarityThreshold: zod_1.z.number().min(0).max(1),
    apiKey: zod_1.z.string(),
    indexName: zod_1.z.string(),
    apiEndpoint: zod_1.z.string()
});
// Bot configuration schema
exports.botSchema = zod_1.z.object({
    type: zod_1.z.enum(['examples', 'flowise', 'smart-search']),
    examples: zod_1.z.array(exports.exampleSchema),
    flowiseId: zod_1.z.string().optional(),
    smartSearch: exports.smartSearchSchema.optional()
});
// Meta schema
exports.metaSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    domain: zod_1.z.string().optional(),
    contactUrl: zod_1.z.string().optional(),
    servicesUrl: zod_1.z.string().optional()
});
// Complete template schema
exports.templateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['NEUTRAL', 'CUSTOM']),
    active: zod_1.z.boolean(),
    subdomain: zod_1.z.string(),
    jsonContent: zod_1.z.string(),
    jsonBranding: zod_1.z.string(),
    jsonBot: zod_1.z.string(),
    jsonMeta: zod_1.z.string(),
    createdAt: zod_1.z.date().or(zod_1.z.string()),
    updatedAt: zod_1.z.date().or(zod_1.z.string())
});
