/**
 * Phase 1 dummy IP-camera data.
 *
 * Mirrors the web module's site -> channel structure (see modules/it/ip-cams.php).
 * Per request, NO cam/channel permission check is applied: every camera and
 * every channel is returned and selectable.
 */
import { Camera, IpCamData, IpCamTemplate } from '@/types';

function channels(names: string[]): Camera['channels'] {
  return names.map((name, i) => ({ ch: i + 1, name }));
}

const cameras: Camera[] = [
  {
    camNum: 1,
    name: 'Head Office',
    hostLabel: 'office-nvr.local',
    type: 'hikvision',
    maxCh: 16,
    channels: channels([
      'Reception',
      'Lobby',
      'Main Entrance',
      'Corridor A',
      'Server Room',
      'Pantry',
      'Meeting Room',
      'Parking Gate',
    ]),
  },
  {
    camNum: 2,
    name: 'Warehouse',
    hostLabel: 'wh-reolink.local',
    type: 'reolink',
    maxCh: 32,
    channels: channels([
      'Dock 1',
      'Dock 2',
      'Aisle 1',
      'Aisle 2',
      'Packing',
      'Cold Storage',
      'Loading Bay',
      'Yard',
    ]),
  },
  {
    camNum: 3,
    name: 'Retail Store',
    hostLabel: 'store-nvr.local',
    type: 'hikvision',
    maxCh: 16,
    channels: channels(['Till', 'Floor', 'Stockroom', 'Back Door']),
  },
];

const templates: IpCamTemplate[] = [
  {
    id: 'tpl-entrances',
    name: 'Entrances 2×2',
    tiles: [
      { camNum: 1, ch: 3 },
      { camNum: 1, ch: 8 },
      { camNum: 2, ch: 7 },
      { camNum: 3, ch: 4 },
    ],
  },
  {
    id: 'tpl-warehouse',
    name: 'Warehouse Floor',
    tiles: [
      { camNum: 2, ch: 1 },
      { camNum: 2, ch: 2 },
      { camNum: 2, ch: 3 },
      { camNum: 2, ch: 4 },
      { camNum: 2, ch: 5 },
      { camNum: 2, ch: 6 },
    ],
  },
  {
    id: 'tpl-reception',
    name: 'Reception (Single)',
    tiles: [{ camNum: 1, ch: 1 }],
  },
];

export const ipCamData: IpCamData = { cameras, templates };

export const MAX_MULTI_STREAMS = 9;
