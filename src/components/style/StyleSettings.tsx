import React, { useState } from 'react';
import { useCanvas } from '../../hooks/useCanvasState';
import {
  Settings, Grid, Play, Plus, Trash2, ChevronRight, ChevronLeft, Presentation, Palette
} from 'lucide-react';
import { PresentationSlide } from '../../types/canvas';

export const StyleSettings: React.FC = () => {
  const ctx = useCanvas();
  const [isOpen, setIsOpen] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const bgTypes = [
    { id: 'dots', label: 'Dots' },
    { id: 'grid', label: 'Grid' },
    { id: 'isometric', label: 'Isometric' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'none', label: 'None' },
  ] as const;

  const bgThemes = [
    { id: 'corporate', label: 'Corporate' },
    { id: 'blueprint', label: 'Blueprint' },
    { id: 'neon', label: 'Neon' },
    { id: 'sketch', label: 'Sketchbook' },
    { id: 'minimal', label: 'Minimal' },
  ] as const;

  // Add presentation slide
  const handleAddSlide = () => {
    const name = prompt('Enter slide name:', `Slide ${ctx.slides.length + 1}`);
    if (!name) return;

    const newSlide: PresentationSlide = {
      id: `slide_${Math.random().toString(36).substring(2, 9)}`,
      name,
      x: ctx.viewport.x,
      y: ctx.viewport.y,
      zoom: ctx.viewport.zoom,
    };

    ctx.setSlides(prev => [...prev, newSlide]);
  };

  const handleDeleteSlide = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.setSlides(prev => prev.filter(s => s.id !== id));
  };

  const handleGoToSlide = (slide: PresentationSlide) => {
    ctx.setViewport({ x: slide.x, y: slide.y, zoom: slide.zoom });
  };

  const startPresentation = () => {
    if (ctx.slides.length === 0) {
      alert('Please add at least one slide to present.');
      return;
    }
    setIsPresenting(true);
    setCurrentSlideIndex(0);
    handleGoToSlide(ctx.slides[0]);
  };

  const nextSlide = () => {
    if (currentSlideIndex < ctx.slides.length - 1) {
      const nextIdx = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIdx);
      handleGoToSlide(ctx.slides[nextIdx]);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      const prevIdx = currentSlideIndex - 1;
      setCurrentSlideIndex(prevIdx);
      handleGoToSlide(ctx.slides[prevIdx]);
    }
  };

  if (isPresenting) {
    const currentSlide = ctx.slides[currentSlideIndex];
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900/90 border border-slate-700/80 backdrop-blur px-5 py-3 rounded-2xl shadow-2xl animate-fade-in select-none">
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[140px]">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Slide {currentSlideIndex + 1} of {ctx.slides.length}
          </div>
          <div className="text-sm font-bold text-slate-200 truncate max-w-[180px]">
            {currentSlide?.name}
          </div>
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === ctx.slides.length - 1}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-slate-700/60 mx-1" />

        <button
          onClick={() => setIsPresenting(false)}
          className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
        >
          Exit Presenter
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-xl border backdrop-blur transition-all flex items-center justify-center shadow-lg ${
          isOpen
            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
            : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
        }`}
        title="Canvas Settings"
      >
        <Settings className="w-4.5 h-4.5" />
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div
          className="absolute bottom-14 left-0 w-64 rounded-2xl border p-4 space-y-4 shadow-2xl"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            borderColor: 'rgba(71, 85, 105, 0.5)',
            animation: 'panelIn 120ms ease-out',
          }}
        >
          {/* Background types */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-blue-400" />
              Grid Pattern
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {bgTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => ctx.setBgType(t.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    ctx.bgType === t.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Themes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Theme Aesthetic
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {bgThemes.map(themeOption => (
                <button
                  key={themeOption.id}
                  onClick={() => ctx.setBgTheme(themeOption.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    ctx.bgTheme === themeOption.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                      : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {themeOption.label}
                </button>
              ))}
            </div>
          </div>

          {/* Presentation Slides */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Presentation className="w-3.5 h-3.5 text-emerald-400" />
                Slides
              </label>
              <button
                onClick={handleAddSlide}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Add current viewport as slide"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {ctx.slides.length === 0 ? (
              <div className="text-[10px] text-slate-600 text-center py-2 bg-slate-900/20 rounded-lg">
                No slides defined yet
              </div>
            ) : (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {ctx.slides.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => handleGoToSlide(s)}
                    className="flex justify-between items-center px-2 py-1 bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer group text-xs text-slate-300"
                  >
                    <span className="truncate max-w-[140px]">{idx + 1}. {s.name}</span>
                    <button
                      onClick={(e) => handleDeleteSlide(s.id, e)}
                      className="p-0.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ctx.slides.length > 0 && (
              <button
                onClick={startPresentation}
                className="w-full py-1.5 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Play className="w-3 h-3" />
                Start Presenting
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
