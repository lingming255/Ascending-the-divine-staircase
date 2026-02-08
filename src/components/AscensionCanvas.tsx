import React, { useRef, useEffect } from 'react';
import { TimePhase, WeatherType } from '../types';
import { ViewMode, StairStyle, EnvironmentType, ColorTheme, useGameStore } from '../store/gameStore';
import { TimelineOverlay } from './TimelineOverlay';

interface AscensionCanvasProps {
  timePhase: TimePhase;
  weather: WeatherType;
  viewMode?: ViewMode;
  stairStyle?: StairStyle;
  environment?: EnvironmentType;
  colorTheme?: ColorTheme;
  className?: string;
}

const AscensionCanvas: React.FC<AscensionCanvasProps> = ({ 
  timePhase, 
  weather, 
  viewMode = 'diagonal', 
  stairStyle = 'minimal',
  environment = 'countryside',
  colorTheme = 'midnight',
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scrollRef = useRef<number>(0);

  // Store connection for camera control
    const { scrollToId, setScrollToId, goals, dashboardViewMode } = useGameStore();

    // Handle ScrollToId
  useEffect(() => {
    if (scrollToId) {
        // Find the goal
        const targetGoal = goals.find(g => g.id === scrollToId);
        if (targetGoal) {
            // Note: AscensionCanvas currently renders a procedural background (Ascension Mode)
            // It does NOT render the Goal Tree nodes. GoalTree is rendered by GoalCanvas.tsx.
            // This component is the background visualizer.
            // Wait, the User Request is about "Link to Canvas interface's belonging goal".
            // The Goal Tree is in `GoalCanvas.tsx`.
            // So I should be modifying `GoalCanvas.tsx` instead of `AscensionCanvas.tsx` for the camera movement?
            // Let's check `GoalCanvas.tsx`.
        }
    }
  }, [scrollToId, goals]);

  const backgroundSeed = useRef<number[]>([]);
    const farBackgroundSeed = useRef<number[]>([]);

    // Better Noise Implementation:
    // Create a static noise canvas once
    const staticNoise = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const cvs = document.createElement('canvas');
        cvs.width = 512;
        cvs.height = 512;
        const c = cvs.getContext('2d');
        if (c) {
            const idata = c.createImageData(512, 512);
            const buffer32 = new Uint32Array(idata.data.buffer);
            for (let i = 0; i < buffer32.length; i++) {
                // ABGR order on little-endian
                // 15 alpha (out of 255) => ~6% opacity
                buffer32[i] = (Math.random() * 255) | 0; // Random noise
                // We want grayscale noise: R=G=B.
                const val = (Math.random() * 255) | 0;
                // Alpha: 15
                buffer32[i] = (15 << 24) | (val << 16) | (val << 8) | val;
            }
            c.putImageData(idata, 0, 0);
            staticNoise.current = cvs;
        }
    }, []);

    useEffect(() => {
        // Initialize background seed
        backgroundSeed.current = Array.from({ length: 50 }, () => Math.random());
        farBackgroundSeed.current = Array.from({ length: 50 }, () => Math.random());
    }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{x: number, y: number, speed: number, size: number}> = [];
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 2 + Math.random() * 5,
        size: Math.random() * 2
      }));
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const drawLayer = (seed: number[], color: string, parallaxSpeed: number, scaleY: number, offsetY: number = 0) => {
        ctx.fillStyle = color;
        
        // Parallax Offset
        // We use scrollRef.current to shift the background horizontally
        const parallaxOffset = (scrollRef.current * parallaxSpeed) % canvas.width;
        
        ctx.save();
        ctx.translate(-parallaxOffset, offsetY);
        
        // Draw twice to handle seamless looping
        for(let loop = 0; loop < 2; loop++) {
            const loopOffset = loop * canvas.width;
            
            if (environment === 'countryside') {
                ctx.beginPath();
                ctx.moveTo(loopOffset, canvas.height);
                for(let x=0; x<=canvas.width; x+=50) {
                    ctx.lineTo(loopOffset + x, canvas.height - (100 + Math.sin(x/200)*50) * scaleY);
                }
                ctx.lineTo(loopOffset + canvas.width, canvas.height);
                ctx.fill();
            } else if (environment === 'city') {
                ctx.beginPath();
                let x = 0;
                let seedIndex = 0;
                while(x < canvas.width) {
                    const rand1 = seed[seedIndex % seed.length];
                    const rand2 = seed[(seedIndex + 1) % seed.length];
                    seedIndex += 2;
                    
                    const w = (30 + rand1 * 50);
                    const h = (50 + rand2 * 150) * scaleY;
                    ctx.rect(loopOffset + x, canvas.height - h, w, h);
                    x += w + 5;
                }
                ctx.fill();
            } else if (environment === 'mountain') {
                ctx.beginPath();
                ctx.moveTo(loopOffset, canvas.height);
                let seedIndex = 0;
                for(let x=0; x<=canvas.width; x+=100) {
                    const rand = seed[seedIndex % seed.length];
                    seedIndex++;
                    ctx.lineTo(loopOffset + x + 50, canvas.height - (200 + rand*100) * scaleY);
                    ctx.lineTo(loopOffset + x + 100, canvas.height);
                }
                ctx.fill();
            } else if (environment === 'desert') {
                ctx.beginPath();
                ctx.moveTo(loopOffset, canvas.height);
                for(let x=0; x<=canvas.width; x+=10) {
                    ctx.lineTo(loopOffset + x, canvas.height - (50 + Math.sin(x/100)*20 + Math.sin(x/300)*40) * scaleY);
                }
                ctx.lineTo(loopOffset + canvas.width, canvas.height);
                ctx.fill();
            } else if (environment === 'beach') {
                // For beach, maybe just horizon line
                 if (scaleY > 0.8) { // Only draw water for near layer
                    ctx.fillRect(loopOffset, canvas.height - 100 * scaleY, canvas.width, 100 * scaleY);
                 }
            } else if (environment === 'rainforest') {
                ctx.beginPath();
                let seedIndex = 0;
                for(let x=0; x<canvas.width; x+=20) {
                    const rand = seed[seedIndex % seed.length];
                    seedIndex++;
                    const h = (50 + rand * 50) * scaleY;
                    ctx.moveTo(loopOffset + x, canvas.height);
                    ctx.lineTo(loopOffset + x, canvas.height - h);
                    ctx.arc(loopOffset + x, canvas.height - h, 15 * scaleY, 0, Math.PI*2);
                }
                ctx.fill();
            }
        }
        ctx.restore();
    };

    const drawBackground = () => {
        const night = timePhase === 'night';
        // Palette Strategy:
        // Use stair colors as base but shift hue/saturation for background to ensure harmony
        // Stair Front Color is the "Main" color
        
        let bgBaseColor = '#475569'; // Default Slate-600
        let colorFar = '#64748b';

        if (colorTheme === 'bamboo') {
            // Bamboo Theme (Sage)
            if (stairStyle === 'ethereal') {
                 bgBaseColor = night ? '#1a2920' : '#8fa894'; // Deep Moss : Sage 400
            } else {
                 bgBaseColor = night ? '#25382c' : '#758f7a'; // Moss : Sage 500
            }
            colorFar = night ? '#1a2920' : '#a4bba8'; // Sage 300
        } else if (colorTheme === 'sunset') {
            // Sunset Theme (Terracotta)
            if (stairStyle === 'ethereal') {
                 bgBaseColor = night ? '#3a2218' : '#e6ccb2'; // Coffee : Warm Beige
            } else {
                 bgBaseColor = night ? '#4f2e22' : '#ddb892'; // Leather : Sand
            }
            colorFar = night ? '#3a2218' : '#ede0d4'; // Light Beige
        } else if (colorTheme === 'ocean') {
            // Ocean Theme (Muted Blue)
            if (stairStyle === 'ethereal') {
                 bgBaseColor = night ? '#0f1c26' : '#9bb0c1'; // Deep Sea : Muted Blue
            } else {
                 bgBaseColor = night ? '#162633' : '#7a94a8'; // Dark Blue : Steel Blue
            }
            colorFar = night ? '#0f1c26' : '#b5c7d6'; // Light Steel
        } else if (colorTheme === 'desert') {
            // Desert Theme (Sandstone)
            if (stairStyle === 'ethereal') {
                 bgBaseColor = night ? '#292524' : '#e3d5ca'; // Warm Dark Grey : Bone
            } else {
                 bgBaseColor = night ? '#44403c' : '#d6ccc2'; // Stone : Warm Grey
            }
            colorFar = night ? '#292524' : '#f5ebe0'; // Light Bone
        } else if (colorTheme === 'city') {
            // City Theme (Cool Grey)
            if (stairStyle === 'ethereal') {
                 bgBaseColor = night ? '#111827' : '#d1d5db'; // Grey 900 : Grey 300
            } else {
                 bgBaseColor = night ? '#1f2937' : '#9ca3af'; // Grey 800 : Grey 400
            }
            colorFar = night ? '#111827' : '#e5e7eb'; // Grey 200
        } else {
            // Midnight Theme (Default Deep Space)
            if (stairStyle === 'ethereal') {
                 bgBaseColor = night ? '#020617' : '#94a3b8'; // Space : Slate 400
            } else {
                 bgBaseColor = night ? '#0f172a' : '#64748b'; // Slate 900 : Slate 500
            }
            colorFar = night ? '#020617' : '#cbd5e1'; // Slate 300
        }
        
        const colorNear = bgBaseColor;
        
        // Clear background
        ctx.fillStyle = colorFar;
        // Draw sky gradient handled by parent div, so we just draw objects
        
        // 1. Far Layer (Slower, lighter/more transparent, scaled up slightly)
        // Using a lower opacity for "atmospheric perspective"
        ctx.globalAlpha = 0.3; // Reduced opacity for subtle look
        drawLayer(farBackgroundSeed.current, colorFar, 0.5, 1.2, -50);
        ctx.globalAlpha = 0.6; // Reduced opacity

        // 2. Mid Layer (Standard speed, standard color)
        drawLayer(backgroundSeed.current, colorNear, 1.0, 1.0, 0);
        ctx.globalAlpha = 1.0;
    };

    const drawStairs = (scroll: number, time: number) => {
      // Dimensions based on style
      let stepWidth = 300;
      let stepHeight = 40;
      let stepDepth = viewMode === 'diagonal' ? 40 : 0;
      
      // 核心算法：利用斜率计算位移向量
      // 1. 定义台阶的几何尺寸（高度与深度）
      const stepH = stepHeight;
      const stepD = stepDepth;
      
      const centerX = canvas.width / 2;
      const startY = canvas.height - 100;
      const visibleSteps = Math.ceil(canvas.height / stepHeight) + 5;
      
      // 3. 计算相对位移 (无需取模，实现真正无限滚动)
      // scroll / stepH 代表我们当前“爬”到了第几阶（可以是小数）
      const currentStepProgress = scroll / stepH;
      
      // 4. 确定可见范围
      // 我们需要渲染当前进度附近的台阶
      // 向下多渲染2阶，向上多渲染 visibleSteps 阶
      const startStepIndex = Math.floor(currentStepProgress) - 2;
      const endStepIndex = startStepIndex + visibleSteps + 2;

      const night = timePhase === 'night';
      let colorFront = '#475569';
      let colorTop = '#94a3b8';
      let colorSide = '#334155';
      let colorMarker = '#d97706'; // Muted Amber

      // Define Color Palettes (Low Profile)
      if (colorTheme === 'bamboo') {
          // Bamboo: Sage/Moss
          colorMarker = '#5a7c65'; // Muted Green
          if (night) {
             colorFront = '#1a2920'; // Deep Moss
             colorTop = '#25382c'; // Moss
             colorSide = '#0f1c12'; // Darkest Moss
          } else {
             colorFront = '#758f7a'; // Sage 500
             colorTop = '#8fa894'; // Sage 400
             colorSide = '#5a7c65'; // Sage 600
          }
      } else if (colorTheme === 'sunset') {
          // Sunset: Clay/Terracotta
          colorMarker = '#9c6644'; // Leather
          if (night) {
             colorFront = '#4f2e22'; // Coffee
             colorTop = '#613b2d'; // Light Coffee
             colorSide = '#3a2218'; // Dark Coffee
          } else {
             colorFront = '#b08968'; // Clay
             colorTop = '#ddb892'; // Sand
             colorSide = '#9c6644'; // Leather
          }
      } else if (colorTheme === 'ocean') {
          // Ocean: Muted Blue/Steel
          colorMarker = '#51718a'; // Steel Blue
          if (night) {
             colorFront = '#162633'; // Dark Blue
             colorTop = '#223544'; // Lighter Dark Blue
             colorSide = '#0f1c26'; // Deep Sea
          } else {
             colorFront = '#51718a'; // Steel Blue
             colorTop = '#7a94a8'; // Light Steel
             colorSide = '#3b5266'; // Dark Steel
          }
      } else if (colorTheme === 'desert') {
          // Desert: Sandstone/Stone
          colorMarker = '#a89f91'; // Stone
          if (night) {
             colorFront = '#44403c'; // Warm Dark Grey
             colorTop = '#57534e'; // Lighter Warm Grey
             colorSide = '#292524'; // Darkest Warm Grey
          } else {
             colorFront = '#c5baaf'; // Sandstone
             colorTop = '#d6ccc2'; // Warm Grey
             colorSide = '#a89f91'; // Stone
          }
      } else if (colorTheme === 'city') {
          // City: Cool Grey
          colorMarker = '#6b7280'; // Grey 500
          if (night) {
             colorFront = '#1f2937'; // Grey 800
             colorTop = '#374151'; // Grey 700
             colorSide = '#111827'; // Grey 900
          } else {
             colorFront = '#6b7280'; // Grey 500
             colorTop = '#9ca3af'; // Grey 400
             colorSide = '#4b5563'; // Grey 600
          }
      } else {
          // Midnight (Default): Slate/Space
          if (night) {
             colorFront = '#0f172a'; // Slate 900
             colorTop = '#1e293b'; // Slate 800
             colorSide = '#020617'; // Slate 950
          } else {
             colorFront = '#475569'; // Slate 600
             colorTop = '#64748b'; // Slate 500
             colorSide = '#334155'; // Slate 700
          }
      }

      if (stairStyle === 'ethereal') {
          const opacity = night ? 0.1 : 0.15;
          const strokeOp = night ? 0.3 : 0.4;
          
          // Ethereal Overrides (Use base colors but transparent)
          // We need to convert hex to rgb to apply opacity. 
          // For simplicity, I'll hardcode ethereal variations per theme
          
          let r=0, g=0, b=0;
          if (colorTheme === 'bamboo') { r=50; g=200; b=150; } // Teal-ish
          else if (colorTheme === 'sunset') { r=250; g=150; b=100; } // Orange-ish
          else if (colorTheme === 'ocean') { r=56; g=189; b=248; } // Sky Blue
          else if (colorTheme === 'desert') { r=251; g=191; b=36; } // Amber
          else if (colorTheme === 'city') { r=168; g=85; b=247; } // Purple
          else { r=100; g=150; b=255; } // Blue-ish

          colorFront = night ? `rgba(${r}, ${g}, ${b}, ${opacity})` : `rgba(${r}, ${g}, ${b}, ${opacity})`;
          colorTop = night ? `rgba(${r+20}, ${g+20}, ${b+20}, ${opacity})` : `rgba(${r+20}, ${g+20}, ${b+20}, ${opacity})`;
          colorSide = night ? `rgba(${r-20}, ${g-20}, ${b-20}, ${opacity})` : `rgba(${r-20}, ${g-20}, ${b-20}, ${opacity})`;
          
          ctx.lineWidth = 1;
          ctx.strokeStyle = night ? `rgba(255,255,255,${strokeOp})` : `rgba(0,0,0,${strokeOp})`;
      }

      // 遍历绝对台阶索引 (Absolute Step Index)
      for (let i = startStepIndex; i < endStepIndex; i++) {
        // 计算该台阶相对于当前视角的“相对索引”
        // 如果 i = 10, currentStepProgress = 10.5, 则 relativeIndex = -0.5 (该台阶已过了一半)
        const relativeIndex = i - currentStepProgress;

        // Ambient Float Animation
        // Use time and index to create a wave
        const floatOffset = Math.sin(time * 0.002 + i * 0.5) * 5;

        // 计算屏幕坐标
        // y: 随着 relativeIndex 减小 (向上爬), y 增大 (向下移)
        // startY 是基准线
        const y = startY - (relativeIndex * stepH) + floatOffset;
        
        // x: 随着 relativeIndex 减小, x 增大 (向右移, 模拟向左上方爬)
        const x = centerX - (relativeIndex * stepD); 

        
        const drawFace = (pathFn: () => void, fill: string, _stroke = false) => {
            ctx.beginPath();
            pathFn();
            ctx.closePath();
            
            // Soft Glow Logic
            if (stairStyle === 'ethereal') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = fill;
            } else {
                // Minimal (Default) Glow
                ctx.shadowBlur = 4;
                ctx.shadowColor = fill;
            }

            ctx.fillStyle = fill;
            ctx.fill();
            
            if (stairStyle === 'ethereal') {
                ctx.stroke();
            } else {
                // Minimal (Default) Stroke
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; // Subtle white stroke
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0; // Reset
        };

        if (viewMode === 'vertical') {
            drawFace(() => {
                ctx.rect(centerX - stepWidth/2, y, stepWidth, stepHeight);
            }, colorFront);
            
            const topY = y;
            const perspectiveOffset = stairStyle === 'ethereal' ? 5 : 10;
            drawFace(() => {
                ctx.moveTo(centerX - stepWidth/2, topY);
                ctx.lineTo(centerX + stepWidth/2, topY);
                ctx.lineTo(centerX + stepWidth/2 - perspectiveOffset, topY - (stepHeight * 0.5));
                ctx.lineTo(centerX - stepWidth/2 + perspectiveOffset, topY - (stepHeight * 0.5));
            }, colorTop);

            if (stairStyle === 'ethereal') {
                ctx.beginPath();
                ctx.moveTo(centerX, y + stepHeight);
                ctx.lineTo(centerX, y + stepHeight + 40); 
                ctx.strokeStyle = ctx.strokeStyle; 
                ctx.stroke();
            }

        } else {
            // Diagonal Mode
            
            // Add slight random width variation for "hand-built" feel
            // Hash function based on index i
            const pseudoRandom = Math.sin(i * 9999);
            const widthVar = 0; // Removed solid variation
            const currentWidth = stepWidth + widthVar;

            drawFace(() => {
                ctx.rect(x, y, currentWidth, stepHeight);
            }, colorFront);
            
            drawFace(() => {
                ctx.moveTo(x, y);
                ctx.lineTo(x + currentWidth, y);
                ctx.lineTo(x + currentWidth + 20, y - 20);
                ctx.lineTo(x + 20, y - 20);
            }, colorTop);

            // Side Face with Texture
            drawFace(() => {
                ctx.moveTo(x + currentWidth, y);
                ctx.lineTo(x + currentWidth + 20, y - 20);
                ctx.lineTo(x + currentWidth + 20, y - 20 + stepHeight);
                ctx.lineTo(x + currentWidth, y + stepHeight);
            }, colorSide);
        }
        
        if (i % 24 === 0) {
            ctx.fillStyle = colorMarker;
            if (viewMode === 'vertical') {
                ctx.fillRect(centerX + stepWidth/2 - 30, y + 5, 20, stepHeight - 10);
            } else {
                ctx.fillRect(x + stepWidth - 20, y - 40, 10, 30);
            }
        }
      }
    };

    const drawWeather = (time: number) => {
        // Ambient Particles (Always visible, but subtle in clear weather)
        // We reuse the 'particles' array but treat them differently based on weather
        
        ctx.lineWidth = 1;

        particles.forEach((p, index) => {
            if (weather === 'rain') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y + 10);
                ctx.stroke();
                p.y += p.speed * 2;
            } else if (weather === 'snow') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                p.y += p.speed / 2;
                p.x += Math.sin(p.y / 50);
            } else if (weather === 'cloudy') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 20, 0, Math.PI * 2);
                ctx.fill();
                p.x += p.speed / 10;
            } else {
                // Clear weather: Ambient Dust Motes / Fireflies
                // Slow floating, breathing opacity
                const opacity = (Math.sin(time * 0.001 + index) + 1) / 2 * 0.3; // 0.0 to 0.3
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Brownian-like slow motion
                p.y -= p.speed * 0.05; // Slowly float up
                p.x += Math.sin(time * 0.0005 + index) * 0.2;
            }

            // Boundary checks
            if (p.y > canvas.height + 50) p.y = -10;
            if (p.y < -50) p.y = canvas.height + 10;
            if (p.x > canvas.width + 50) p.x = -10;
            if (p.x < -50) p.x = canvas.width + 10;
        });
    };

    // Generate Noise Pattern - REMOVED DEAD CODE

    const drawNoise = () => {
        if (!staticNoise.current) return;
        
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.5;
        
        // Tiling the noise
        const pat = ctx.createPattern(staticNoise.current, 'repeat');
        if (pat) {
            // Shift pattern slightly every frame to make it "alive"
            const offsetX = Math.random() * 100;
            const offsetY = Math.random() * 100;
            ctx.translate(offsetX, offsetY);
            ctx.fillStyle = pat;
            ctx.fillRect(-offsetX, -offsetY, canvas.width + offsetX, canvas.height + offsetY);
        }
        
        ctx.restore();
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw layers
      drawBackground();
      
      scrollRef.current += 0.1; // Reduced speed (was 0.5)
      drawStairs(scrollRef.current, time); // Pass time for float animation
      drawWeather(time); // Pass time for particles
      
      drawNoise(); // Film Grain Overlay

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [timePhase, weather, viewMode, stairStyle, environment]);

  return (
    <div className={`absolute top-0 left-0 w-full h-full ${className}`}>
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
        {dashboardViewMode === 'timeline' && <TimelineOverlay onOpenMap={() => {}} />}
    </div>
  );
};

export default AscensionCanvas;
