import type { StyleSpecification } from 'maplibre-gl';

/** 免付費 OSM raster 圖磚（FleetPage / OrderDetailPage 共用） */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export const DEFAULT_MAP_CENTER: [number, number] = [121.5654, 25.033];

export const MAP_HEIGHT = {
  fleet: 'min(600px, 70vh)',
  track: 'min(500px, 60vh)',
} as const;
