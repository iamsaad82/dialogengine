import React from 'react';

interface CallToActionBoxProps {
  title: string;
  buttonText: string;
  onButtonClick: () => void;
}

export function CallToActionBox({ 
  title = "Oder fragen Sie einfach: \"Wie funktioniert Ihr Content Management?\"",
  buttonText = "In den Dialog-Modus wechseln",
  onButtonClick 
}: CallToActionBoxProps) {
  return (
    <div className="mt-12 bg-indigo-50/50 rounded-2xl p-8 text-center">
      <p className="text-lg text-indigo-600 mb-4">
        {title}
      </p>
      <button
        onClick={onButtonClick}
        className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {buttonText} <span className="ml-2">→</span>
      </button>
    </div>
  );
} 