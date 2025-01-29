"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Template, IconType, ParsedContent, ParsedBranding } from '@/lib/types/template';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Features } from '@/components/Features';
import { CallToActionBox } from '@/components/CallToActionBox';
import DialogMode from '@/components/DialogMode';
import { Showcase } from '@/components/Showcase';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ChatbotLandingPageProps {
  template: Template;
}

export function ChatbotLandingPage({ template }: ChatbotLandingPageProps) {
  const [isDialogMode, setIsDialogMode] = React.useState(false);
  const [content, setContent] = React.useState<ParsedContent | null>(null);
  const [branding, setBranding] = React.useState<ParsedBranding | null>(null);

  React.useEffect(() => {
    try {
      // Parse content if it's a string
      const parsedContent = typeof template.jsonContent === 'string' 
        ? JSON.parse(template.jsonContent) 
        : template.jsonContent;
      
      // Parse branding if it's a string
      const parsedBranding = typeof template.jsonBranding === 'string'
        ? JSON.parse(template.jsonBranding)
        : template.jsonBranding;
      
      console.log('Template content:', template.jsonContent);
      console.log('Parsed content:', parsedContent);
      console.log('Parsed branding:', parsedBranding);
      
      // Set CSS variables for the template colors
      if (parsedBranding?.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', parsedBranding.primaryColor);
      }
      
      // Set the content and branding directly
      setContent(parsedContent);
      setBranding(parsedBranding);
    } catch (error) {
      console.error('Error parsing template data:', error);
    }
  }, [template]);

  useEffect(() => {
    if (branding?.primaryColor) {
      // Convert hex color with opacity
      document.documentElement.style.setProperty('--background', `${branding.primaryColor}05`);
      document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
    }
  }, [branding?.primaryColor]);

  // Show loading state if content or branding is not yet available
  if (!content || !branding) {
    console.log('Content or branding is null:', { content, branding });
    return <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700">Daten werden geladen...</h2>
      </div>
    </div>;
  }

  console.log('Rendering with content:', content);
  console.log('Rendering with branding:', branding);

  return (
    <div className="min-h-screen bg-primary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto flex justify-center items-center h-16">
          {branding.logo && (
            <Link href={`/${template.subdomain}`}>
              <Image 
                src={branding.logo.startsWith('/') ? branding.logo : `/${branding.logo}`}
                alt={template.name}
                width={100}
                height={100}
                className="mb-4 hover:scale-105 transition-transform duration-300"
                priority
              />
            </Link>
          )}
        </div>
      </header>

      <div className="pt-24">
        <AnimatePresence mode="wait">
          {isDialogMode ? (
            <DialogMode template={template} isDialogMode={isDialogMode} onModeChange={setIsDialogMode} />
          ) : (
            <div className="space-y-16">
              {/* Content */}
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero */}
                {content.hero && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-12"
                  >
                    <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                      <span style={{ color: branding.primaryColor }}>{content.hero.title}</span>
                      {content.hero.subtitle && (
                        <span className="block text-4xl sm:text-5xl mt-2" style={{ color: branding.primaryColor }}>
                          {content.hero.subtitle}
                        </span>
                      )}
                    </h1>
                    {content.hero.description && (
                      <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                        {content.hero.description}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Mode Switcher */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-16 px-4"
                >
                  <div className="inline-flex flex-col items-center max-w-full">
                    <div 
                      onClick={() => setIsDialogMode(!isDialogMode)}
                      className="flex items-center gap-3 bg-white rounded-full shadow-lg p-2 cursor-pointer hover:shadow-xl transition-all duration-300 w-auto"
                    >
                      {/* Left side - Classic Mode */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                        !isDialogMode ? 'bg-opacity-10 border' : 'opacity-75'
                      }`} 
                      style={{ 
                        backgroundColor: !isDialogMode ? `${branding.primaryColor}15` : 'transparent',
                        borderColor: !isDialogMode ? branding.primaryColor : 'transparent'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding.primaryColor }}>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <line x1="3" y1="9" x2="21" y2="9"/>
                          <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        <span className="font-medium text-sm sm:text-base whitespace-nowrap" style={{ color: !isDialogMode ? branding.primaryColor : '#666666' }}>
                          Klassisch
                        </span>
                      </div>

                      {/* Switch */}
                      <div className="relative w-12 h-6 bg-gray-200 rounded-full cursor-pointer shrink-0">
                        <div 
                          className="absolute w-5 h-5 rounded-full transition-all duration-300 shadow-md"
                          style={{ 
                            backgroundColor: branding.primaryColor,
                            left: isDialogMode ? '26px' : '2px',
                            top: '2px'
                          }}
                        />
                      </div>

                      {/* Right side - Dialog Mode */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                        isDialogMode ? 'bg-opacity-10 border' : 'opacity-75'
                      }`} 
                      style={{ 
                        backgroundColor: isDialogMode ? `${branding.primaryColor}15` : 'transparent',
                        borderColor: isDialogMode ? branding.primaryColor : 'transparent'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: branding.primaryColor }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="font-medium text-sm sm:text-base whitespace-nowrap" style={{ color: isDialogMode ? branding.primaryColor : '#666666' }}>
                          Dialog
                        </span>
                      </div>
                    </div>

                    {/* Helper Text */}
                    <p className="mt-2 text-xs sm:text-sm text-gray-600">
                      Tippen zum Wechseln
                    </p>
                  </div>
                </motion.div>

                {/* Showcase */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-12"
                >
                  {content.showcase && (
                    <Showcase 
                      content={{
                        image: content.showcase.image.startsWith('/') ? content.showcase.image : `/${content.showcase.image}`,
                        altText: content.showcase.altText,
                        context: {
                          title: content.showcase.context?.title || '',
                          description: content.showcase.context?.description || ''
                        },
                        cta: {
                          title: content.showcase.cta?.title || '',
                          hint: content.showcase.cta?.question || '',
                          question: content.showcase.cta?.question || ''
                        }
                      }}
                      onDialogModeClick={() => setIsDialogMode(true)}
                      primaryColor={branding.primaryColor}
                    />
                  )}
                </motion.div>

                {/* Features */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-16"
                >
                  {/* Titel-Container über dem Grid */}
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl font-semibold mb-3">Alle Vorteile auf einen Blick</h2>
                    <p className="text-gray-600">Entdecken Sie die wichtigsten Funktionen unserer Plattform</p>
                  </div>

                  {/* Grid mit Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {content.features && content.features.length > 0 && (
                      <Features features={content.features} branding={branding} />
                    )}
                  </div>

                  {content.contact && (
                    <div className="text-center max-w-2xl mx-auto mt-24 mb-16">
                      <h2 className="text-3xl font-bold mb-4">{content.contact.title}</h2>
                      <p className="text-gray-600 mb-8">{content.contact.description}</p>
                      <a
                        href={`mailto:${content.contact.email}`}
                        className="inline-flex items-center px-6 py-3 rounded-lg text-white transition-colors"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        {content.contact.buttonText}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 