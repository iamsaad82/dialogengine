"use client";

import React from 'react';
import { 
  Zap, 
  Clock, 
  Brain, 
  Blocks, 
  Users, 
  Lightbulb, 
  CircuitBoard,
  BrainCircuit 
} from 'lucide-react';
import { Feature } from '@/lib/types/template';
import { ParsedBranding } from '@/lib/types/template';

function hexToRgba(hex: string, alpha: number = 1): string {
  // Remove the hash if it exists
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface FeaturesProps {
  features: Feature[];
  branding: ParsedBranding;
}

const icons = {
  Zap,
  Clock,
  clock: Clock,
  Brain,
  Blocks,
  Users,
  Lightbulb,
  CircuitBoard,
  BrainCircuit,
  brain: Brain,
  blocks: Blocks,
  users: Users,
  lightbulb: Lightbulb,
  circuitboard: CircuitBoard,
  braincircuit: BrainCircuit,
  zap: Zap
} as const;

export function Features({ features, branding }: FeaturesProps) {
  console.log('Features received:', features);

  return (
    <>
      {features.map((feature, index) => {
        let Icon = icons[feature.icon as keyof typeof icons];
        
        if (!Icon && typeof feature.icon === 'string') {
          Icon = icons[feature.icon.toLowerCase() as keyof typeof icons];
        }
        
        if (!Icon) {
          console.warn(`Icon "${feature.icon}" not found`);
          return null;
        }

        return (
          <div key={index} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl group hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-md">
            <div className="mb-4 p-3 rounded-xl transition-shadow"
              style={{ 
                backgroundColor: branding.primaryColor.startsWith('#')
                  ? hexToRgba(branding.primaryColor, 0.05)  // 5% Opazität
                  : branding.primaryColor
              }}
            >
              <Icon className="w-7 h-7" style={{ color: branding.primaryColor }} />
            </div>
            <h3 className="text-lg font-semibold mb-3 group-hover:text-[--primary-color] transition-colors"
              style={{ '--primary-color': branding.primaryColor } as React.CSSProperties}
            >
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
          </div>
        );
      })}
    </>
  );
} 