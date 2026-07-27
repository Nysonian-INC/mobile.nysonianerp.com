import { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette, radius, spacing, typography } from '@/theme';

type Props = {
  onChange: (dataUrl: string | null) => void;
  height?: number;
};

type Point = { x: number; y: number };
type Stroke = Point[];

function strokesToSvgPath(stroke: Stroke): string {
  if (stroke.length === 0) return '';
  const [first, ...rest] = stroke;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (const p of rest) {
    d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

function strokesToPngDataUrl(strokes: Stroke[], width: number, height: number): string | null {
  if (strokes.length === 0 || width <= 0 || height <= 0) return null;

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const dpr = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 1) : 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#11162B';
    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
    return canvas.toDataURL('image/png');
  }

  return encodeStrokesAsPng(strokes, width, height);
}

/** Pure-JS PNG encoder for native (no WebView / DOM canvas). */
function encodeStrokesAsPng(strokes: Stroke[], width: number, height: number): string | null {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const pixels = new Uint8Array(w * h * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }

  const setPixel = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
      const x2 = xi + dx;
      const y2 = yi + dy;
      if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue;
      const j = (y2 * w + x2) * 4;
      pixels[j] = 17;
      pixels[j + 1] = 22;
      pixels[j + 2] = 43;
      pixels[j + 3] = 255;
    }
  };

  const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      setPixel(x, y);
      if (Math.abs(x - x1) < 0.5 && Math.abs(y - y1) < 0.5) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  };

  for (const stroke of strokes) {
    if (stroke.length === 1) setPixel(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      drawLine(stroke[i - 1].x, stroke[i - 1].y, stroke[i].x, stroke[i].y);
    }
  }

  return `data:image/png;base64,${encodePngRgba(pixels, w, h)}`;
}

function encodePngRgba(pixels: Uint8Array, width: number, height: number): string {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }
  const chunks: number[] = [...signature];
  chunks.push(...pngChunk('IHDR', ihdr));
  chunks.push(...pngChunk('IDAT', zlibStore(raw)));
  chunks.push(...pngChunk('IEND', new Uint8Array(0)));
  return bytesToBase64(new Uint8Array(chunks));
}

function writeUint32(arr: Uint8Array, offset: number, value: number) {
  arr[offset] = (value >>> 24) & 0xff;
  arr[offset + 1] = (value >>> 16) & 0xff;
  arr[offset + 2] = (value >>> 8) & 0xff;
  arr[offset + 3] = value & 0xff;
}

function pngChunk(type: string, data: Uint8Array): number[] {
  const typeBytes = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)];
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  writeUint32(out, 8 + data.length, crc32(new Uint8Array([...typeBytes, ...data])));
  return Array.from(out);
}

function zlibStore(data: Uint8Array): Uint8Array {
  const blocks: number[] = [0x78, 0x01];
  let offset = 0;
  while (offset < data.length) {
    const chunkLen = Math.min(65535, data.length - offset);
    const isLast = offset + chunkLen >= data.length ? 1 : 0;
    blocks.push(isLast, chunkLen & 0xff, (chunkLen >> 8) & 0xff, (~chunkLen) & 0xff, ((~chunkLen) >> 8) & 0xff);
    for (let i = 0; i < chunkLen; i++) blocks.push(data[offset + i]);
    offset += chunkLen;
  }
  const adler = adler32(data);
  blocks.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff);
  return new Uint8Array(blocks);
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63] + chars[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[triple & 63] : '=';
  }
  return out;
}

/**
 * Signature pad that works on Expo web + native.
 * Avoids react-native-webview (unsupported on RN web / causes forwardRef errors).
 */
export default function SignaturePad({ onChange, height = 160 }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke>([]);
  const [padSize, setPadSize] = useState({ width: 320, height });

  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke>([]);
  const sizeRef = useRef(padSize);
  const onChangeRef = useRef(onChange);
  strokesRef.current = strokes;
  currentRef.current = current;
  sizeRef.current = padSize;
  onChangeRef.current = onChange;

  const emit = useCallback((next: Stroke[]) => {
    if (next.length === 0) {
      onChangeRef.current(null);
      return;
    }
    const { width, height: h } = sizeRef.current;
    onChangeRef.current(strokesToPngDataUrl(next, width, h));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const stroke: Stroke = [{ x: locationX, y: locationY }];
        currentRef.current = stroke;
        setCurrent(stroke);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const stroke = [...currentRef.current, { x: locationX, y: locationY }];
        currentRef.current = stroke;
        setCurrent(stroke);
      },
      onPanResponderRelease: () => {
        const finished = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        if (finished.length === 0) return;
        const next = [...strokesRef.current, finished];
        strokesRef.current = next;
        setStrokes(next);
        emit(next);
      },
      onPanResponderTerminate: () => {
        currentRef.current = [];
        setCurrent([]);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    if (width > 0 && h > 0) setPadSize({ width, height: h });
  };

  const clear = () => {
    strokesRef.current = [];
    currentRef.current = [];
    setStrokes([]);
    setCurrent([]);
    onChange(null);
  };

  const hasInk = strokes.length > 0 || current.length > 0;
  const allStrokes = current.length > 0 ? [...strokes, current] : strokes;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.pad,
          { height },
          Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : null,
        ]}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%" pointerEvents="none">
          {allStrokes.map((stroke, i) => {
            const d = strokesToSvgPath(stroke);
            if (!d) return null;
            return (
              <Path
                key={`s-${i}`}
                d={d}
                stroke={palette.text}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}
        </Svg>
        {!hasInk ? (
          <View pointerEvents="none" style={styles.placeholder}>
            <Text style={styles.placeholderText}>Draw your signature</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.foot}>
        <Text style={styles.hint}>{hasInk ? 'Signature captured' : 'Sign inside the box'}</Text>
        <Pressable onPress={clear} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  pad: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.white,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { ...typography.small, color: palette.textFaint },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
  clear: { ...typography.small, color: palette.primary, fontWeight: '700' },
});
