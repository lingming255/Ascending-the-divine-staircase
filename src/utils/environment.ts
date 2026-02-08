import { TimePhase } from '../types';
import { ColorTheme } from '../store/gameStore';

export const getTimePhase = (time: number): TimePhase => {
  if (time >= 5 && time < 10) return 'morning';
  if (time >= 10 && time < 16) return 'noon'; // Extended noon
  if (time >= 16 && time < 19) return 'dusk'; // Shortened afternoon/dusk
  if (time >= 19 && time < 20) return 'dusk'; 
  return 'night';
};

// Brighter, more distinct palettes per user request
export const getSkyGradient = (phase: TimePhase, weather: string, theme: ColorTheme = 'midnight'): string => {
  const isGloomy = weather === 'rain' || weather === 'snow' || weather === 'cloudy';

  if (isGloomy) {
    if (theme === 'bamboo') {
        // Gloomy Bamboo (Misty Green/Grey) - Desaturated
        switch (phase) {
          case 'morning': return 'linear-gradient(to top, #788585, #a3b8b8)'; 
          case 'noon': return 'linear-gradient(to top, #94a3a3, #b8c7c7)'; // Softer noon
          case 'afternoon': return 'linear-gradient(to top, #788585, #a3b8b8)';
          case 'dusk': return 'linear-gradient(to top, #5c6b6b, #788585)'; 
          case 'night': return 'linear-gradient(to top, #1a2e2e, #2f4545)'; 
          default: return 'linear-gradient(to top, #2f4545, #4a6363)';
        }
    } else if (theme === 'sunset') {
        // Gloomy Sunset (Muted Brown/Red) - Desaturated
        switch (phase) {
          case 'morning': return 'linear-gradient(to top, #8f7e7e, #b8a3a3)'; 
          case 'noon': return 'linear-gradient(to top, #a69393, #c4b0b0)';
          case 'afternoon': return 'linear-gradient(to top, #8f7e7e, #b8a3a3)';
          case 'dusk': return 'linear-gradient(to top, #6b5c5c, #8f7e7e)'; 
          case 'night': return 'linear-gradient(to top, #362424, #4d3333)'; 
          default: return 'linear-gradient(to top, #4d3333, #6b4d4d)';
        }
    }
    // Midnight (Default Slate)
    switch (phase) {
      case 'morning': return 'linear-gradient(to top, #64748b, #94a3b8)'; // Darker start
      case 'noon': return 'linear-gradient(to top, #94a3b8, #cbd5e1)'; // Muted noon
      case 'afternoon': return 'linear-gradient(to top, #64748b, #94a3b8)';
      case 'dusk': return 'linear-gradient(to top, #475569, #64748b)'; 
      case 'night': return 'linear-gradient(to top, #0f172a, #1e293b)'; 
      default: return 'linear-gradient(to top, #1e293b, #334155)';
    }
  }

  // Clear weather - Low Profile & Ambient Palettes
  if (theme === 'bamboo') {
      // Bamboo Theme (Sage/Moss - No Neon Greens)
      switch (phase) {
        case 'morning': return 'linear-gradient(to top, #a4bba8, #c8d9cc)'; // Sage 300
        case 'noon': return 'linear-gradient(to top, #8fa894, #a4bba8)'; // Sage 400
        case 'afternoon': return 'linear-gradient(to top, #758f7a, #8fa894)'; // Sage 500
        case 'dusk': return 'linear-gradient(to top, #d4b08c, #d4a373)'; // Muted Earth
        case 'night': return 'linear-gradient(to top, #1a2920, #25382c)'; // Deep Moss
        default: return 'linear-gradient(to top, #1a2920, #25382c)';
      }
  } else if (theme === 'sunset') {
      // Sunset Theme (Terracotta/Clay - No Neon Oranges)
      switch (phase) {
        case 'morning': return 'linear-gradient(to top, #e6ccb2, #ede0d4)'; // Warm Beige
        case 'noon': return 'linear-gradient(to top, #ddb892, #e6ccb2)'; // Sand
        case 'afternoon': return 'linear-gradient(to top, #b08968, #ddb892)'; // Clay
        case 'dusk': return 'linear-gradient(to top, #9c6644, #7f5539)'; // Leather
        case 'night': return 'linear-gradient(to top, #3a2218, #4f2e22)'; // Coffee
        default: return 'linear-gradient(to top, #3a2218, #3a2218)';
      }
  } else if (theme === 'ocean') {
      // Ocean Theme (Deep Slate Blue - No Cyan)
      switch (phase) {
        case 'morning': return 'linear-gradient(to top, #9bb0c1, #b5c7d6)'; // Muted Blue
        case 'noon': return 'linear-gradient(to top, #7a94a8, #9bb0c1)'; 
        case 'afternoon': return 'linear-gradient(to top, #51718a, #7a94a8)';
        case 'dusk': return 'linear-gradient(to top, #3b5266, #51718a)';
        case 'night': return 'linear-gradient(to top, #0f1c26, #162633)'; // Deep Sea
        default: return 'linear-gradient(to top, #0f1c26, #162633)';
      }
  } else if (theme === 'desert') {
      // Desert Theme (Sandstone/Beige - No Bright Yellow)
      switch (phase) {
        case 'morning': return 'linear-gradient(to top, #e3d5ca, #f5ebe0)'; // Bone
        case 'noon': return 'linear-gradient(to top, #d6ccc2, #e3d5ca)'; // Warm Grey
        case 'afternoon': return 'linear-gradient(to top, #c5baaf, #d6ccc2)';
        case 'dusk': return 'linear-gradient(to top, #a89f91, #c5baaf)'; // Stone
        case 'night': return 'linear-gradient(to top, #292524, #44403c)'; // Warm Dark Grey
        default: return 'linear-gradient(to top, #292524, #292524)';
      }
  } else if (theme === 'city') {
      // City Theme (Cool Grey/Lavender - No Neon Purple)
      switch (phase) {
        case 'morning': return 'linear-gradient(to top, #d1d5db, #e5e7eb)'; // Grey 300
        case 'noon': return 'linear-gradient(to top, #9ca3af, #d1d5db)'; // Grey 400
        case 'afternoon': return 'linear-gradient(to top, #6b7280, #9ca3af)'; // Grey 500
        case 'dusk': return 'linear-gradient(to top, #4b5563, #6b7280)'; // Grey 600
        case 'night': return 'linear-gradient(to top, #111827, #1f2937)'; // Grey 900
        default: return 'linear-gradient(to top, #111827, #1f2937)';
      }
  }

  // Midnight (Default Deep Space)
  switch (phase) {
    case 'morning': return 'linear-gradient(to top, #64748b, #94a3b8)'; // Slate
    case 'noon': return 'linear-gradient(to top, #475569, #64748b)'; // Darker Slate
    case 'afternoon': return 'linear-gradient(to top, #334155, #475569)';
    case 'dusk': return 'linear-gradient(to top, #1e293b, #334155)'; 
    case 'night': return 'linear-gradient(to top, #020617, #0f172a)'; // Deep Space
    default: return 'linear-gradient(to top, #020617, #0f172a)';
  }
};
