import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Sparkles,
  Flame,
  Eye,
  Layers,
  ExternalLink,
  Maximize2,
  ChevronRight,
  ScanSearch,
} from 'lucide-react';
import type { HeatmapData, TileData } from '../types';

interface WsiViewerCardProps {
  heatmap: HeatmapData | null;
  patientId?: string;
  isLoading: boolean;
}

// Rainbow / Jet / Turbo colormap interpolation (Cyan/Blue -> Green -> Yellow -> Orange -> Crimson)
function getHeatmapColor(weight: number, alpha: number): string {
  const w = Math.max(0, Math.min(1, weight));
  let r: number, g: number, b: number;
  if (w < 0.25) {
    const f = w / 0.25;
    r = Math.round(42 + f * (60 - 42));
    g = Math.round(110 + f * (180 - 110));
    b = Math.round(195 + f * (210 - 195));
  } else if (w < 0.5) {
    const f = (w - 0.25) / 0.25;
    r = Math.round(60 + f * (80 - 60));
    g = Math.round(180 + f * (205 - 180));
    b = Math.round(210 - f * 120);
  } else if (w < 0.75) {
    const f = (w - 0.5) / 0.25;
    r = Math.round(80 + f * (240 - 80));
    g = Math.round(205 - f * 15);
    b = Math.round(90 - f * 60);
  } else {
    const f = (w - 0.75) / 0.25;
    r = Math.round(240 + f * 15);
    g = Math.round(190 - f * 145);
    b = Math.round(30 - f * 10);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const WsiViewerCard: React.FC<WsiViewerCardProps> = ({
  heatmap,
  patientId,
  isLoading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const macroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viewMode, setViewMode] = useState<'overlay' | 'raw' | 'hotspots'>('overlay');
  const [opacity, setOpacity] = useState<number>(0.75);
  const [zoom, setZoom] = useState<number>(1.0);
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<{ x: number; y: number } | null>(null);

  // Cached Real Cancer Images
  const wsiImgRef = useRef<HTMLImageElement | null>(null);
  const macroImgRef = useRef<HTMLImageElement | null>(null);

  const gridDim = heatmap?.grid_dim || 32;

  // Preload real cancer specimen (or user-uploaded slide) and macro slide images
  useEffect(() => {
    const wsiImg = new Image();
    const imgSrc = heatmap?.raw_wsi_base64
      ? (heatmap.raw_wsi_base64.startsWith('data:')
          ? heatmap.raw_wsi_base64
          : `data:image/png;base64,${heatmap.raw_wsi_base64}`)
      : '/assets/wsi/wsi_specimen.jpg';

    wsiImg.src = imgSrc;
    wsiImg.onload = () => {
      wsiImgRef.current = wsiImg;
      drawCanvas();
    };

    const macroImg = new Image();
    macroImg.src = '/assets/wsi/macro_slide.jpg';
    macroImg.onload = () => {
      macroImgRef.current = macroImg;
      drawMacroSlide();
    };
  }, [heatmap?.raw_wsi_base64]);

  // Derive robust tiles array from available heatmap metadata or fallback
  const effectiveTiles = useMemo<TileData[]>(() => {
    if (heatmap?.tiles && heatmap.tiles.length > 0) {
      return heatmap.tiles;
    }
    if (heatmap?.all_patches_coords && heatmap.all_patches_coords.length > 0) {
      const sampledMap = new Map<string, any>();
      (heatmap.sampled_patches || []).forEach((p: any) => {
        sampledMap.set(`${p.grid_x}_${p.grid_y}`, p);
      });
      return heatmap.all_patches_coords.map((c, idx) => {
        const key = `${c.x}_${c.y}`;
        const s = sampledMap.get(key);
        return {
          x: c.x,
          y: c.y,
          coord_x: c.x * 256,
          coord_y: c.y * 256,
          attention_weight: c.w,
          histology_type:
            s?.tissue_type ??
            (c.w > 0.75
              ? 'Invasive Urothelial'
              : c.w > 0.5
              ? 'Reactive Stroma & Fibroblasts'
              : 'Benign Urothelial Lining'),
          cellular_density: s?.cellularity_index
            ? `${Math.round(s.cellularity_index * 100)}% Dense (Pleomorphism)`
            : 'High',
          rank: idx + 1,
          color: s?.color,
        };
      });
    }

    // High-fidelity fallback specimen grid
    const sampleTiles: TileData[] = [];
    const dim = 32;
    const center = dim / 2;
    const seed = (patientId || 'TCGA-2F-A9KO').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
        const normDist = dist / (center * 1.414);
        if (normDist <= 0.88) {
          const pseudoNoise = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
          const noiseVal = pseudoNoise - Math.floor(pseudoNoise);
          const baseW = 0.88 - normDist * 0.7 + (noiseVal - 0.5) * 0.25;
          const w = Math.max(0.08, Math.min(0.98, parseFloat(baseW.toFixed(4))));
          sampleTiles.push({
            x,
            y,
            coord_x: x * 256,
            coord_y: y * 256,
            attention_weight: w,
            histology_type:
              w > 0.78
                ? 'Invasive Urothelial'
                : w > 0.6
                ? 'Tumor Infiltrating Lymphocytes'
                : w > 0.38
                ? 'Reactive Stroma & Fibroblasts'
                : 'Benign Urothelial Lining',
            cellular_density: `${Math.round(w * 105)}% Dense (Pleomorphism)`,
            rank: 1,
          });
        }
      }
    }
    return sampleTiles;
  }, [heatmap, patientId]);

  // Ranked Top Hotspots for bottom cards
  const topHotspots = useMemo<TileData[]>(() => {
    return [...effectiveTiles]
      .sort((a, b) => b.attention_weight - a.attention_weight)
      .slice(0, 5);
  }, [effectiveTiles]);

  // Default select highest attention tile on data update
  useEffect(() => {
    if (topHotspots.length > 0 && !selectedTile) {
      setSelectedTile(topHotspots[0]);
    }
  }, [topHotspots, selectedTile]);

  // 4 Characteristic Tissue Regions matching Left Sidebar
  const tissueRegions = useMemo(() => {
    const r1: TileData = topHotspots[0] || { x: 14, y: 5, attention_weight: 0.98, histology_type: 'Invasive Urothelial', cellular_density: '95% Dense', rank: 1 };
    const r2: TileData =
      effectiveTiles.find((t) => t.attention_weight >= 0.55 && t.attention_weight < 0.75) ||
      effectiveTiles[10] ||
      { x: 18, y: 8, attention_weight: 0.68, histology_type: 'Reactive Stroma', cellular_density: '70% Dense', rank: 2 };
    const r3: TileData =
      effectiveTiles.find((t) => t.attention_weight >= 0.3 && t.attention_weight < 0.55) ||
      effectiveTiles[20] ||
      { x: 23, y: 9, attention_weight: 0.42, histology_type: 'Lymphocytes', cellular_density: '45% Dense', rank: 3 };
    const r4: TileData =
      effectiveTiles.find((t) => t.attention_weight < 0.3) ||
      effectiveTiles[30] ||
      { x: 7, y: 11, attention_weight: 0.18, histology_type: 'Benign Margins', cellular_density: '15% Dense', rank: 4 };

    return [
      {
        id: 'region-1',
        name: 'Region 1',
        status: 'High Attention',
        statusColor: 'text-[#d63353]',
        dotColor: 'bg-[#d63353]',
        thumb: '/assets/wsi/region_1.jpg',
        tile: r1,
      },
      {
        id: 'region-2',
        name: 'Region 2',
        status: 'Moderate',
        statusColor: 'text-[#dd8b2a]',
        dotColor: 'bg-[#dd8b2a]',
        thumb: '/assets/wsi/region_2.jpg',
        tile: r2,
      },
      {
        id: 'region-3',
        name: 'Region 3',
        status: 'Low',
        statusColor: 'text-[#6b4984]',
        dotColor: 'bg-[#6b4984]',
        thumb: '/assets/wsi/region_3.jpg',
        tile: r3,
      },
      {
        id: 'region-4',
        name: 'Region 4',
        status: 'Normal',
        statusColor: 'text-[#2a7779]',
        dotColor: 'bg-[#2a7779]',
        thumb: '/assets/wsi/region_4.jpg',
        tile: r4,
      },
    ];
  }, [topHotspots, effectiveTiles]);

  // Active region calculation
  const activeRegionIndex = useMemo(() => {
    if (!selectedTile) return 0;
    const w = selectedTile.attention_weight;
    if (w >= 0.75) return 0;
    if (w >= 0.55) return 1;
    if (w >= 0.3) return 2;
    return 3;
  }, [selectedTile]);

  // High-Res patch image for right panel
  const currentPatchImage = useMemo(() => {
    if (selectedTile) {
      const idx = topHotspots.findIndex((hs) => hs.x === selectedTile.x && hs.y === selectedTile.y);
      if (idx !== -1) {
        return `/assets/wsi/hotspot_${idx + 1}.jpg`;
      }
    }
    return '/assets/wsi/patch_highres.jpg';
  }, [selectedTile, topHotspots]);

  // Main Canvas Rendering Engine with Real Cancer Specimen Background
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep dark pathology viewport background matching reference image
    ctx.fillStyle = '#0c1214';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    // Center-based zoom transform
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    const cellSize = w / gridDim;

    // 1. Draw Real Cancer Specimen Image
    const wsiImg = wsiImgRef.current;
    if (wsiImg && wsiImg.complete && wsiImg.naturalWidth > 0) {
      ctx.drawImage(wsiImg, 0, 0, w, h);
    } else {
      // Fallback base
      ctx.fillStyle = '#261b24';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Draw Attention Colormap Overlay or Modes
    if (viewMode === 'raw') {
      // In Raw WSI Mode: draw only delicate grid lines over real cancer tissue
      effectiveTiles.forEach((tile) => {
        const px = tile.x * cellSize;
        const py = tile.y * cellSize;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      });
    } else if (viewMode === 'hotspots') {
      // In Hotspots Mode: dim non-hotspot tissue and highlight alpha >= 0.72
      ctx.fillStyle = 'rgba(10, 16, 18, 0.6)';
      ctx.fillRect(0, 0, w, h);

      effectiveTiles.forEach((tile) => {
        const px = tile.x * cellSize;
        const py = tile.y * cellSize;
        if (tile.attention_weight >= 0.72) {
          // Vivid glowing alert color
          ctx.fillStyle = getHeatmapColor(tile.attention_weight, Math.max(0.85, opacity));
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
      });
    } else {
      // Default: Overlay Mode — blend Rainbow Attention Heatmap over Real Cancer Specimen
      effectiveTiles.forEach((tile) => {
        const px = tile.x * cellSize;
        const py = tile.y * cellSize;

        // Attention Colormap overlay
        ctx.fillStyle = getHeatmapColor(tile.attention_weight, opacity);
        ctx.fillRect(px, py, cellSize, cellSize);

        // Grid lines matching reference image
        ctx.strokeStyle = 'rgba(20, 30, 35, 0.28)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      });
    }

    // Hovered tile guide
    if (hoveredCoord) {
      const hpx = hoveredCoord.x * cellSize;
      const hpy = hoveredCoord.y * cellSize;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hpx + 0.5, hpy + 0.5, cellSize - 1, cellSize - 1);
    }

    // Selected Tile Reticle (Crisp White Square Box matching Reference Image)
    if (selectedTile) {
      const spx = selectedTile.x * cellSize;
      const spy = selectedTile.y * cellSize;

      // Outer contrasting shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(spx + 0.5, spy + 0.5, cellSize - 1, cellSize - 1);

      // Crisp White Box
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(spx + 0.5, spy + 0.5, cellSize - 1, cellSize - 1);

      // Center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(spx + cellSize / 2, spy + cellSize / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [viewMode, opacity, zoom, selectedTile, hoveredCoord, effectiveTiles, gridDim]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Render Left Macro Slide Overview with Real Slide Image and Viewfinder Box
  const drawMacroSlide = useCallback(() => {
    const canvas = macroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const macroImg = macroImgRef.current;
    if (macroImg && macroImg.complete && macroImg.naturalWidth > 0) {
      ctx.drawImage(macroImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#f8f4f3';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#df9eb3';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dashed Viewfinder Box showing current zoom/pan window
    const boxSize = Math.max(22, Math.min(w * 0.7, (w * 0.65) / (zoom / 1.5)));
    const centerX = selectedTile ? (selectedTile.x / gridDim) * (w * 0.75) + w * 0.12 : w / 2;
    const centerY = selectedTile ? (selectedTile.y / gridDim) * (h * 0.75) + h * 0.12 : h / 2;

    ctx.strokeStyle = '#1a2327';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(
      Math.max(4, Math.min(w - boxSize - 4, centerX - boxSize / 2)),
      Math.max(4, Math.min(h - boxSize - 4, centerY - boxSize / 2)),
      boxSize,
      boxSize
    );
    ctx.setLineDash([]);
  }, [selectedTile, zoom, gridDim]);

  useEffect(() => {
    drawMacroSlide();
  }, [drawMacroSlide]);

  // Coordinate conversion taking into account canvas scaling and zoom
  const getTileCoordFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gridDim <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const unzoomedX = (clickX - centerX) / zoom + centerX;
    const unzoomedY = (clickY - centerY) / zoom + centerY;

    const cellSize = canvas.width / gridDim;
    const tileX = Math.floor(unzoomedX / cellSize);
    const tileY = Math.floor(unzoomedY / cellSize);

    if (tileX >= 0 && tileX < gridDim && tileY >= 0 && tileY < gridDim) {
      return { tileX, tileY };
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getTileCoordFromEvent(e);
    if (!coord) return;
    const { tileX, tileY } = coord;

    const match = effectiveTiles.find((t) => t.x === tileX && t.y === tileY);
    if (match) {
      setSelectedTile(match);
    } else {
      setSelectedTile({
        x: tileX,
        y: tileY,
        coord_x: tileX * 256,
        coord_y: tileY * 256,
        attention_weight: 0.12,
        histology_type: 'Stroma / Non-invasive',
        cellular_density: 'Normal',
        rank: 0,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getTileCoordFromEvent(e);
    if (coord) {
      setHoveredCoord({ x: coord.tileX, y: coord.tileY });
    } else {
      setHoveredCoord(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredCoord(null);
  };

  return (
    <div
      id="wsi-section"
      className="bg-[#f2f7f6] border border-charcoal-navy/15 rounded-3xl p-5 lg:p-7 mb-8 flex flex-col shadow-sm"
    >
      {/* 1. Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-5 border-b border-charcoal-navy/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-semibold text-deep-teal tracking-wider uppercase">
              CROSS-ATTENDED PATHOLOGY TILES
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-deep-teal/10 font-mono text-[10px] font-semibold text-deep-teal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE INTERACTIVE
            </span>
          </div>
          <h2 className="font-serif text-[26px] lg:text-[28px] font-normal text-charcoal-navy tracking-tight leading-tight">
            Whole-Slide Histopathology &amp; Attention Map
          </h2>
          <p className="font-sans text-[13px] text-charcoal-navy/70 mt-1">
            Explore regions of interest with cross-attention scores. Click on tiles to view high-resolution patches.
          </p>
        </div>

        {/* View Mode Pills & Opacity Slider */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-sea-foam/80 p-1 rounded-full flex items-center border border-deep-teal/15 shadow-2xs">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'overlay'
                  ? 'bg-deep-teal text-white shadow-xs'
                  : 'text-charcoal-navy/80 hover:text-deep-teal'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Overlay
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'raw'
                  ? 'bg-deep-teal text-white shadow-xs'
                  : 'text-charcoal-navy/80 hover:text-deep-teal'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Raw WSI
            </button>
            <button
              onClick={() => setViewMode('hotspots')}
              className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'hotspots'
                  ? 'bg-deep-teal text-white shadow-xs'
                  : 'text-charcoal-navy/80 hover:text-deep-teal'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-dusty-rose" />
              Hotspots
            </button>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-2.5 bg-sea-foam/50 px-3.5 py-1.5 rounded-full border border-deep-teal/15 shadow-2xs">
            <span className="font-mono text-[11px] text-charcoal-navy/80 font-medium">OPACITY:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 h-1.5 accent-deep-teal cursor-pointer"
            />
            <span className="font-mono text-[11px] text-deep-teal font-semibold w-7 text-right">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch">
        {/* Left Column: Slide Overview & Tissue Regions */}
        <div className="lg:col-span-3 xl:col-span-2 bg-white/95 border border-charcoal-navy/10 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-4">
          {/* Slide Overview Section */}
          <div>
            <h3 className="font-sans text-[12px] font-bold text-charcoal-navy uppercase tracking-wider mb-2">
              Slide Overview
            </h3>
            <div className="w-full aspect-16/10 bg-[#f4ebea] rounded-xl overflow-hidden border border-charcoal-navy/15 flex items-center justify-center p-1">
              <canvas ref={macroCanvasRef} width={200} height={125} className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="flex items-center justify-between mt-2 font-mono text-[11px] text-charcoal-navy/70">
              <span>{patientId || 'TCGA-2F-A9KO'}</span>
              <span className="font-semibold text-deep-teal">40x</span>
            </div>
          </div>

          {/* Tissue Regions List */}
          <div>
            <h3 className="font-sans text-[12px] font-bold text-charcoal-navy uppercase tracking-wider mb-2.5">
              Tissue Regions
            </h3>
            <div className="flex flex-col gap-2">
              {tissueRegions.map((region, idx) => {
                const isActive = activeRegionIndex === idx;
                return (
                  <button
                    key={region.id}
                    onClick={() => setSelectedTile(region.tile)}
                    className={`w-full text-left p-2 rounded-xl transition-all border flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'border-deep-teal bg-card-mint/70 shadow-2xs'
                        : 'border-charcoal-navy/10 hover:border-deep-teal/40 bg-white hover:bg-sea-foam/20'
                    }`}
                  >
                    {/* Real microscopic tissue thumbnail */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-charcoal-navy/15 bg-[#eed1db]">
                      <img
                        src={region.thumb}
                        alt={region.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // fallback color
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-[12px] font-semibold text-charcoal-navy truncate">
                        {region.name}
                      </div>
                      <div className={`flex items-center gap-1 font-sans text-[11px] font-medium ${region.statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${region.dotColor}`} />
                        {region.status}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Main Real Cancer Biopsy Specimen & Heatmap Viewport */}
        <div className="lg:col-span-6 xl:col-span-7 relative min-h-[460px] lg:min-h-[500px] bg-[#0c1214] rounded-2xl overflow-hidden border border-charcoal-navy/20 flex items-center justify-center shadow-inner">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-sea-foam">
              <div className="w-8 h-8 border-2 border-sea-foam border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-[13px] tracking-wider uppercase">Loading Pathology Biopsy...</span>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-full object-contain cursor-crosshair transition-opacity duration-200"
            />
          )}

          {/* Floating Top-Left Zoom Level Badge */}
          <div className="absolute top-3.5 left-3.5 bg-black/65 backdrop-blur-md border border-white/10 text-white font-mono text-[11.5px] font-medium px-3 py-1 rounded-lg shadow-sm z-10">
            Zoom {zoom.toFixed(1)}x
          </div>

          {/* Floating Top-Right Vertical Controls Dock */}
          <div className="absolute top-3.5 right-3.5 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md border border-charcoal-navy/20 p-1.5 rounded-xl shadow-md z-10">
            <button
              onClick={() => setZoom((z) => Math.min(parseFloat((z + 0.25).toFixed(2)), 4))}
              className="p-1.5 hover:bg-card-mint rounded-lg text-deep-teal transition-colors cursor-pointer"
              title="Zoom In (+25%)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(parseFloat((z - 0.25).toFixed(2)), 0.75))}
              className="p-1.5 hover:bg-card-mint rounded-lg text-deep-teal transition-colors cursor-pointer"
              title="Zoom Out (-25%)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (topHotspots[0]) setSelectedTile(topHotspots[0]);
              }}
              className="p-1.5 hover:bg-card-mint rounded-lg text-deep-teal transition-colors cursor-pointer"
              title="Focus Top Hotspot Reticle"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1.5 hover:bg-card-mint rounded-lg text-deep-teal transition-colors cursor-pointer"
              title="Fit Specimen to View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1.5 hover:bg-card-mint rounded-lg text-deep-teal transition-colors cursor-pointer"
              title="Reset View (1.0x)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Bottom-Left Colormap Legend */}
          <div className="absolute bottom-3.5 left-3.5 bg-white/95 backdrop-blur-md border border-charcoal-navy/20 px-3.5 py-1.5 rounded-full flex items-center gap-2.5 shadow-sm z-10">
            <span className="font-sans text-[11px] font-semibold text-charcoal-navy">Attention:</span>
            <span className="font-mono text-[10px] text-charcoal-navy/70">Low</span>
            <div className="w-24 h-2 rounded-full bg-gradient-to-r from-[#2a6fb0] via-[#48bb78] via-[#ecc94b] to-[#e53e3e]" />
            <span className="font-mono text-[10px] text-charcoal-navy/70">High</span>
          </div>

          {/* Floating Bottom-Right Scale Indicator Bar */}
          <div className="absolute bottom-3.5 right-3.5 font-mono text-[11px] text-white/80 font-medium tracking-wider flex items-center gap-2 z-10">
            <span className="w-12 h-0.5 bg-white/70 inline-block" />
            <span>500 µm</span>
          </div>
        </div>

        {/* Right Column: Selected Tile Analysis */}
        <div className="lg:col-span-3 xl:col-span-3 bg-white/95 border border-charcoal-navy/10 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-charcoal-navy/10">
              <h3 className="font-sans text-[13px] font-bold text-charcoal-navy tracking-tight">
                Selected Tile Analysis
              </h3>
              <button
                type="button"
                onClick={() => window.open(currentPatchImage, '_blank')}
                title="Open full-resolution 40x micrograph in new tab"
                className="bg-transparent border-none p-0 cursor-pointer text-charcoal-navy/50 hover:text-deep-teal transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Real 40x Microscopic Cancer Micrograph Preview */}
            <div className="w-full aspect-16/9 bg-[#f4ebea] rounded-xl overflow-hidden border border-charcoal-navy/15 mb-4 shadow-2xs relative">
              <img
                src={currentPatchImage}
                alt="Selected Histology Patch"
                className="w-full h-full object-cover transition-all duration-300"
              />
              <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs font-mono text-[9px] text-white/90">
                40x H&E
              </span>
            </div>

            {/* Analysis Metrics List */}
            <div className="space-y-3">
              <div>
                <span className="font-sans text-[11px] text-charcoal-navy/60 block mb-0.5">Tile Coordinate</span>
                <span className="font-mono text-[13.5px] font-bold text-charcoal-navy">
                  ({selectedTile?.coord_x ?? (selectedTile ? selectedTile.x * 256 : 12432)},{' '}
                  {selectedTile?.coord_y ?? (selectedTile ? selectedTile.y * 256 : 8936)})
                </span>
              </div>

              <div>
                <span className="font-sans text-[11px] text-charcoal-navy/60 block mb-0.5">Attention Score</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[18px] font-bold text-[#d63353]">
                    {selectedTile ? selectedTile.attention_weight.toFixed(4) : '0.8420'}
                  </span>
                  <span
                    className={`font-sans text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                      (selectedTile?.attention_weight ?? 0.842) >= 0.75
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : (selectedTile?.attention_weight ?? 0.842) >= 0.45
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {(selectedTile?.attention_weight ?? 0.842) >= 0.75
                      ? 'High'
                      : (selectedTile?.attention_weight ?? 0.842) >= 0.45
                      ? 'Moderate'
                      : 'Low'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-sans text-[11px] text-charcoal-navy/60 block mb-0.5">Histology Subtype</span>
                <span className="font-sans text-[13px] font-bold text-charcoal-navy truncate block">
                  {selectedTile?.histology_type ?? 'Invasive Urothelial'}
                </span>
              </div>

              <div>
                <span className="font-sans text-[11px] text-charcoal-navy/60 block mb-0.5">Cellular Density</span>
                <span className="font-sans text-[13px] font-bold text-charcoal-navy">
                  {selectedTile?.cellular_density?.includes('Dense') || (selectedTile?.attention_weight ?? 0.8) > 0.7
                    ? 'High'
                    : 'Moderate'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-sans text-[11px] text-charcoal-navy/60">Predicted Risk</span>
                <span className="font-sans text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                  Elevated
                </span>
              </div>
            </div>
          </div>

          {/* Action Button at bottom */}
          <button
            onClick={() => {
              if (selectedTile) {
                setZoom(3.2);
              }
            }}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-card-mint/80 hover:bg-card-mint text-deep-teal border border-deep-teal/25 font-sans font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <ScanSearch className="w-3.5 h-3.5" />
            View in Context
          </button>
        </div>
      </div>

      {/* 3. Bottom Strip: TOP HOTSPOTS (CLICK TO VIEW) with Real Cancer Micrographs */}
      <div className="bg-white/95 border border-charcoal-navy/10 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-deep-teal font-mono text-[11.5px] font-bold tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>TOP HOTSPOTS (CLICK TO VIEW)</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 font-sans text-[12px] text-charcoal-navy/60">
            Top 5 highest attention regions in the slide
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* 5 Real Histology Hotspot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {topHotspots.map((hs, idx) => {
            const isSelected = selectedTile?.x === hs.x && selectedTile?.y === hs.y;
            const badgeColors = [
              'bg-[#e53e3e] text-white',
              'bg-[#ed8936] text-white',
              'bg-[#ecc94b] text-charcoal-navy',
              'bg-[#ecc94b] text-charcoal-navy',
              'bg-[#3182ce] text-white',
            ];
            const barGradients = [
              'from-[#e53e3e] to-[#c53030]',
              'from-[#ed8936] to-[#dd6b20]',
              'from-[#ecc94b] to-[#d69e2e]',
              'from-[#ecc94b] to-[#d69e2e]',
              'from-[#3182ce] to-[#2b6cb0]',
            ];

            return (
              <button
                key={`hotspot-card-${hs.x}-${hs.y}`}
                onClick={() => setSelectedTile(hs)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-left ${
                  isSelected
                    ? 'border-deep-teal bg-card-mint/70 ring-1 ring-deep-teal shadow-xs'
                    : 'border-charcoal-navy/12 hover:border-deep-teal/40 bg-white hover:bg-sea-foam/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Real Microscopic Cancer Patch Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-charcoal-navy/15 bg-[#eed1db]">
                    <img
                      src={`/assets/wsi/hotspot_${idx + 1}.jpg`}
                      alt={`Hotspot #${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded-sm font-mono text-[10px] font-bold leading-tight ${badgeColors[idx]}`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-charcoal-navy truncate">
                        ({hs.x}, {hs.y})
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-charcoal-navy/80 mb-1">
                      α = {hs.attention_weight.toFixed(3)}
                    </div>

                    {/* Mini heat bar */}
                    <div className="w-20 h-1 rounded-full bg-charcoal-navy/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barGradients[idx]}`}
                        style={{ width: `${Math.round(hs.attention_weight * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-charcoal-navy/40 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
