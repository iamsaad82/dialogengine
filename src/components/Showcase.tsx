"use client";

import React from 'react';
import Image from 'next/image';
import { ParsedContent } from '@/lib/types/template';
import { MessageCircle } from 'lucide-react';

interface ShowcaseProps {
  content: {
    image: string;
    altText: string;
    context?: {
      title: string;
      description: string;
    };
    cta?: {
      title: string;
      question: string;
      hint: string;
    };
  };
  onDialogModeClick: () => void;
  primaryColor: string;
}

export function Showcase({ content, onDialogModeClick, primaryColor }: ShowcaseProps) {
  return (
    <div className="space-y-8">
      {/* Headline und Text */}
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">{content.context?.title}</h2>
        <p className="text-gray-600">{content.context?.description}</p>
      </div>

      {/* Bild und Call-to-Action als zusammenhängende Einheit */}
      <div className="w-full shadow-lg rounded-lg overflow-hidden">
        {/* Bild */}
        <div className="relative w-full aspect-[16/9]">
          <Image
            src={content.image}
            alt={content.altText || ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Call to Action Box */}
        <div className="bg-white border-t border-gray-100">
          <div 
            className="px-8 py-6 relative"
            style={{ 
              background: `linear-gradient(to right, ${primaryColor}08, ${primaryColor}03), linear-gradient(to bottom, white, rgba(255, 255, 255, 0.95))`
            }}
          >
            <div className="flex items-center justify-between gap-12">
              {/* Text-Bereich */}
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-2" style={{ color: primaryColor }}>
                  {content.cta?.title || 'Oder fragen Sie einfach:'}
                </h3>
                <p className="text-base text-gray-700">
                  {content.cta?.question || 'Wie funktioniert Ihr Content Management?'}
                </p>
              </div>

              {/* Switcher */}
              <button
                onClick={onDialogModeClick}
                className="flex items-center gap-3 bg-white rounded-full shadow-sm hover:shadow-md p-2 cursor-pointer transition-all duration-300 border border-gray-100"
              >
                {/* Klassisch (aktiv) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    border: `1px solid ${primaryColor}`
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: primaryColor }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  <span className="font-medium text-sm whitespace-nowrap" style={{ color: primaryColor }}>
                    Klassisch
                  </span>
                </div>

                {/* Switch */}
                <div className="relative w-12 h-6 bg-gray-100 rounded-full cursor-pointer shrink-0">
                  <div 
                    className="absolute w-5 h-5 rounded-full transition-all duration-300 shadow-sm"
                    style={{ 
                      backgroundColor: primaryColor,
                      left: '2px',
                      top: '2px'
                    }}
                  />
                </div>

                {/* Dialog (deaktiviert) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-sm whitespace-nowrap text-gray-400">
                    Dialog
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 