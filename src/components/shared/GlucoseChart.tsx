/**
 * GlucoseChart — Gráfica SVG de glucosa compartida entre todos los modos.
 *
 * Mismas features en adolescente, adulto y padres:
 *  • Curva Catmull-Rom multicolor (rojo/verde/naranja por zona)
 *  • Selector de ventana 3h / 6h / 12h / 24h
 *  • Línea "AHORA" con etiqueta
 *  • Tooltip interactivo al tocar un punto
 *  • Halo pulsante en el último punto
 *  • Barra de estadísticas (Mín / Media / Máx / Lecturas)
 *  • Tiempo en Rango (TIR) en cabecera
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, useWindowDimensions, Platform, type LayoutChangeEvent } from 'react-native';
import { Svg, G, Path, Line, Circle, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { DyslexiaText } from './DyslexiaText';
import type { AppColors } from '@/hooks/useAppColors';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface GlucoseReading { value: number; timestamp: string; source: string; }
interface ChartPoint { x: number; y: number; v: number; time: string; }

// ── Curva suave (Catmull-Rom) ────────────────────────────────────────────────

function smoothPath(pts: ChartPoint[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// ── Segmentos coloreados por zona ────────────────────────────────────────────

function coloredSegments(
  pts: ChartPoint[], yLow: number, yHigh: number,
): { d: string; color: string }[] {
  if (pts.length < 2) return [];
  const zoneOf  = (p: ChartPoint) => p.y > yLow ? 'low' : p.y < yHigh ? 'high' : 'ok';
  const colorOf = (z: string) => z === 'low' ? '#EF4444' : z === 'high' ? '#F59E0B' : '#10B981';
  const segs: { d: string; color: string }[] = [];
  let segPts: ChartPoint[] = [pts[0]];
  let curZone = zoneOf(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const z = zoneOf(pts[i]);
    if (z !== curZone) {
      segPts.push(pts[i]);
      segs.push({ d: smoothPath(segPts), color: colorOf(curZone) });
      segPts = [pts[i - 1], pts[i]];
      curZone = z;
    } else {
      segPts.push(pts[i]);
    }
  }
  if (segPts.length > 1) segs.push({ d: smoothPath(segPts), color: colorOf(curZone) });
  return segs;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const CHART_WINDOWS = [3, 6, 12, 24] as const;
type ChartWindowH = typeof CHART_WINDOWS[number];
const CHART_TICK_STEP: Record<ChartWindowH, number> = { 3: 1, 6: 2, 12: 3, 24: 6 };
const Y_MIN = 40;
const Y_MAX = 380;

// ── Componente ───────────────────────────────────────────────────────────────

export interface GlucoseChartProps {
  readings: GlucoseReading[];
  C: AppColors;
  targetLow?: number;
  targetHigh?: number;
  defaultWindow?: ChartWindowH;
}

export function GlucoseChart({
  readings,
  C,
  targetLow  = 70,
  targetHigh = 180,
  defaultWindow = 24,
}: GlucoseChartProps) {
  const { width: screenW } = useWindowDimensions();
  const [selected, setSelected]     = useState<ChartPoint | null>(null);
  const [windowH, setWindowH]       = useState<ChartWindowH>(defaultWindow);
  const [containerW, setContainerW] = useState(0);

  // Usa el ancho real del contenedor (medido con onLayout) para evitar recortes
  // cuando el padding del padre no coincide con el offset de 64px esperado.
  const W = Math.min(containerW > 0 ? containerW : screenW - 64, 600);
  const H      = 260;
  const PAD_L  = 44;
  const PAD_R  = 14;
  const PAD_T  = 20;
  const PAD_B  = 36;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const now   = new Date();
  const today = now.toDateString();

  const winEnd   = now.getTime();
  const winStart = windowH === 24
    ? new Date(now).setHours(0, 0, 0, 0)
    : winEnd - windowH * 3_600_000;
  const winSpan  = winEnd - winStart;

  const todayReadings = readings
    .filter(r => {
      const d = new Date(r.timestamp);
      return !isNaN(d.getTime()) && d.toDateString() === today;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const windowReadings = todayReadings.filter(r => {
    const t = new Date(r.timestamp).getTime();
    return t >= winStart && t <= winEnd && r.source !== 'Fingerstick';
  });

  const hasData = windowReadings.length > 0;
  const toX     = (ts: string) => PAD_L + ((new Date(ts).getTime() - winStart) / winSpan) * chartW;
  const nowX    = PAD_L + ((winEnd - winStart) / winSpan) * chartW;
  const rawValues = windowReadings.map(r => r.value);

  const yFromVal = (v: number) =>
    PAD_T + chartH - ((Math.min(Math.max(v, Y_MIN), Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)) * chartH;

  const pts: ChartPoint[] = windowReadings.map(r => {
    const d = new Date(r.timestamp);
    return {
      x: toX(r.timestamp),
      y: yFromVal(r.value),
      v: r.value,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
  });

  const visiblePts = pts.reduce<ChartPoint[]>((acc, p) => {
    if (acc.length === 0) return [p];
    return p.x - acc[acc.length - 1].x >= 16 ? [...acc, p] : [...acc.slice(0, -1), p];
  }, []);

  const dotColor = (v: number) =>
    v < targetLow ? '#EF4444' : v <= targetHigh ? '#10B981' : v <= targetHigh + 70 ? '#F59E0B' : '#EF4444';

  const yHigh  = yFromVal(targetHigh);
  const yLow   = yFromVal(targetLow);
  const axisB  = PAD_T + chartH;

  const isDark     = C.scheme === 'dark';
  const axisColor  = isDark ? '#334155' : '#E2E8F0';
  const gridColor  = isDark ? '#1E293B' : '#F1F5F9';
  const labelColor = isDark ? '#64748B' : '#94A3B8';
  const cardBg     = isDark ? '#1E293B' : '#FFFFFF';
  // Compatible con AppColors (cardBorder) y ModeTheme (border)
  const border = (C as any).cardBorder ?? (C as any).border ?? '#E2E8F0';

  const inRange = rawValues.filter(v => v >= targetLow && v <= targetHigh).length;
  const tir     = rawValues.length > 0 ? Math.round((inRange / rawValues.length) * 100) : null;
  const avgVal  = rawValues.length > 0
    ? Math.round(rawValues.reduce((a, b) => a + b, 0) / rawValues.length)
    : null;

  const gridValues: number[] = [];
  for (let v = 50; v <= 350; v += 50) gridValues.push(v);

  const tickStep = CHART_TICK_STEP[windowH];
  const hourTicks: { x: number; label: string }[] = [];
  const startHour = Math.ceil(new Date(winStart).getHours() + new Date(winStart).getMinutes() / 60);
  for (let h = startHour; h <= 24; h += tickStep) {
    const d = new Date(winStart); d.setHours(h, 0, 0, 0);
    const t = d.getTime();
    if (t < winStart || t > winEnd) continue;
    hourTicks.push({ x: PAD_L + ((t - winStart) / winSpan) * chartW, label: `${h % 24}h` });
  }

  const segments = coloredSegments(pts, yLow, yHigh);
  const fullPath = smoothPath(pts);
  const fillPath = pts.length > 1
    ? `${fullPath} L ${pts[pts.length - 1].x} ${axisB} L ${pts[0].x} ${axisB} Z`
    : '';

  const lastPt  = pts[pts.length - 1];
  const lastVal = windowReadings[windowReadings.length - 1];
  const showLabels = visiblePts.length <= 10;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setContainerW(e.nativeEvent.layout.width)}>
      {/* ── CABECERA ── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <View>
          <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '800' }}>Glucosa hoy</DyslexiaText>
          {hasData && lastVal && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <DyslexiaText variant="h2" color={dotColor(lastVal.value)} style={{ fontWeight: '900', fontSize: 28 }}>
                {lastVal.value}
              </DyslexiaText>
              <DyslexiaText variant="caption" color={dotColor(lastVal.value)} style={{ fontWeight: '700' }}>
                mg/dL
              </DyslexiaText>
            </View>
          )}
        </View>
        {hasData && tir !== null && (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <DyslexiaText variant="caption" color={C.darkTertiary}>Tiempo en rango</DyslexiaText>
            <DyslexiaText
              variant="h3"
              color={tir >= 70 ? '#10B981' : tir >= 50 ? '#F59E0B' : '#EF4444'}
              style={{ fontWeight: '900', fontSize: 22 }}
            >
              {tir}%
            </DyslexiaText>
          </View>
        )}
      </View>

      {/* ── SELECTOR DE VENTANA ── */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        {CHART_WINDOWS.map(w => {
          const active = w === windowH;
          return (
            <TouchableOpacity
              key={w}
              onPress={() => { setWindowH(w); setSelected(null); }}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12, paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: active ? C.health : (isDark ? '#1E293B' : '#F1F5F9'),
                borderWidth: 1,
                borderColor: active ? C.health : (isDark ? '#334155' : '#E2E8F0'),
              }}
            >
              <DyslexiaText variant="caption" color={active ? '#fff' : labelColor} style={{ fontWeight: '700' }}>
                {w}h
              </DyslexiaText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── SVG ── */}
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="cgFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#10B981" stopOpacity={isDark ? 0.35 : 0.22} />
            <Stop offset="0.6" stopColor="#10B981" stopOpacity={isDark ? 0.06 : 0.04} />
            <Stop offset="1"   stopColor="#10B981" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={H} fill="transparent"
          {...(Platform.OS !== 'web' ? { onPress: () => setSelected(null) } : {})} />

        {/* Cuadrícula */}
        {gridValues.map(v => {
          const y = yFromVal(v);
          if (y < PAD_T || y > axisB) return null;
          const isTarget = v === targetLow || v === targetHigh;
          return (
            <React.Fragment key={v}>
              <Line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={isTarget ? (isDark ? '#334155' : '#CBD5E1') : gridColor}
                strokeWidth={isTarget ? 1 : 0.8}
                strokeDasharray={isTarget ? '4,3' : undefined}
                opacity={isTarget ? 0.9 : 1}
              />
              <SvgText
                x={PAD_L - 5} y={y + 4}
                fill={v === targetLow ? '#EF4444' : v === targetHigh ? '#10B981' : labelColor}
                fontSize="10" fontWeight={isTarget ? '700' : '400'}
                textAnchor="end" opacity={0.9}
              >
                {v}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Zonas de color de fondo */}
        <Rect x={PAD_L} y={yHigh} width={chartW} height={Math.max(0, yLow - yHigh)}
          fill="#10B981" opacity={isDark ? 0.08 : 0.06} />
        <Rect x={PAD_L} y={PAD_T} width={chartW} height={Math.max(0, yHigh - PAD_T)}
          fill="#F59E0B" opacity={isDark ? 0.07 : 0.04} />
        <Rect x={PAD_L} y={yLow} width={chartW} height={Math.max(0, axisB - yLow)}
          fill="#EF4444" opacity={isDark ? 0.07 : 0.04} />

        {/* Línea AHORA */}
        {nowX >= PAD_L && nowX <= W - PAD_R && (
          <>
            <Line x1={nowX} y1={PAD_T} x2={nowX} y2={axisB}
              stroke="#6366F1" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.7} />
            <Rect x={nowX - 14} y={PAD_T - 14} width={28} height={13} rx={4} ry={4} fill="#6366F1" opacity={0.9} />
            <SvgText x={nowX} y={PAD_T - 4} fill="#fff" fontSize="8" fontWeight="700" textAnchor="middle">
              AHORA
            </SvgText>
          </>
        )}

        {/* Eje X */}
        <Line x1={PAD_L} y1={axisB} x2={W - PAD_R} y2={axisB} stroke={axisColor} strokeWidth={1.5} />
        {hourTicks.map(tick => (
          <React.Fragment key={tick.label}>
            <Line x1={tick.x} y1={axisB} x2={tick.x} y2={axisB + 5} stroke={labelColor} strokeWidth={0.8} />
            <SvgText x={tick.x} y={axisB + 17} fill={labelColor} fontSize="9" textAnchor="middle">
              {tick.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Estado vacío */}
        {!hasData && (
          <>
            <SvgText x={W / 2} y={PAD_T + chartH / 2 - 12} fill={labelColor}
              fontSize="14" textAnchor="middle" fontWeight="600" opacity={0.6}>
              Sin lecturas hoy
            </SvgText>
            <SvgText x={W / 2} y={PAD_T + chartH / 2 + 10} fill={labelColor}
              fontSize="10" textAnchor="middle" opacity={0.4}>
              Conecta Nightscout o añade una lectura
            </SvgText>
          </>
        )}

        {/* Relleno bajo la curva */}
        {pts.length > 1 && <Path d={fillPath} fill="url(#cgFill)" />}

        {/* Línea multicolor */}
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <Path d={seg.d} fill="none"
              stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.09)'}
              strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={seg.d} fill="none"
              stroke={seg.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </React.Fragment>
        ))}

        {/* Punto único */}
        {pts.length === 1 && (
          <>
            <Line
              x1={Math.max(PAD_L + 2, pts[0].x - 28)} y1={pts[0].y}
              x2={Math.min(W - PAD_R - 2, pts[0].x + 28)} y2={pts[0].y}
              stroke={dotColor(pts[0].v)} strokeWidth={3} strokeLinecap="round"
            />
            <SvgText x={pts[0].x} y={pts[0].y - 14} fill={dotColor(pts[0].v)}
              fontSize="14" fontWeight="800" textAnchor="middle">
              {pts[0].v}
            </SvgText>
          </>
        )}

        {/* Puntos interactivos */}
        {visiblePts.map((p, i) => {
          const col    = dotColor(p.v);
          const isSel  = selected?.time === p.time && selected?.v === p.v;
          const isLast = i === visiblePts.length - 1;
          const status = p.v < 70 ? 'Baja' : p.v <= 180 ? 'Normal' : p.v <= 250 ? 'Alta' : 'Muy alta';

          const TW = 114, TH = 64, TR = 12;
          let tx = p.x - TW / 2;
          if (tx < PAD_L) tx = PAD_L;
          if (tx + TW > W - PAD_R) tx = W - PAD_R - TW;
          const above = p.y > PAD_T + TH + 20;
          const ty    = above ? p.y - TH - 14 : p.y + 14;

          return (
            <G key={i}>
              {isSel && (
                <>
                  <Line x1={p.x} y1={above ? ty + TH : ty}
                    x2={p.x} y2={above ? p.y - 10 : p.y + 10}
                    stroke={col} strokeWidth={1.5} opacity={0.5} strokeDasharray="3,2" />
                  <Rect x={tx + 2} y={ty + 3} width={TW} height={TH} rx={TR} ry={TR} fill="#000" opacity={0.07} />
                  <Rect x={tx}     y={ty}     width={TW} height={TH} rx={TR} ry={TR}
                    fill={cardBg} stroke={col} strokeWidth={1.5} />
                  <SvgText x={tx + TW / 2} y={ty + 25} fill={col} fontSize="22" textAnchor="middle" fontWeight="900">
                    {p.v}
                  </SvgText>
                  <SvgText x={tx + TW / 2} y={ty + 38} fill={col} fontSize="9" textAnchor="middle" opacity={0.65}>
                    mg/dL · {status}
                  </SvgText>
                  <SvgText x={tx + TW / 2} y={ty + 55} fill={labelColor} fontSize="10" textAnchor="middle">
                    {p.time}
                  </SvgText>
                </>
              )}

              {isLast && !isSel && <Circle cx={p.x} cy={p.y} r={14} fill={col} opacity={0.15} />}
              {isSel            && <Circle cx={p.x} cy={p.y} r={16} fill={col} opacity={0.18} />}

              <Circle cx={p.x} cy={p.y} r={isSel ? 7 : isLast ? 6.5 : 4.5} fill={col} />
              <Circle cx={p.x} cy={p.y} r={isSel ? 3.5 : isLast ? 3 : 2} fill="#fff" />

              {showLabels && !isSel && (
                <SvgText x={p.x} y={p.y - (isLast ? 14 : 11)} fill={col}
                  fontSize={isLast ? '12' : '9'} fontWeight={isLast ? '800' : '600'}
                  textAnchor="middle">
                  {p.v}
                </SvgText>
              )}

              <Circle cx={p.x} cy={p.y} r={22} fill="transparent"
                {...(Platform.OS !== 'web' ? { onPress: () => setSelected(isSel ? null : p) } : {})} />
            </G>
          );
        })}

        {/* Halo último punto */}
        {lastPt && !selected && (
          <>
            <Circle cx={lastPt.x} cy={lastPt.y} r={20} fill={dotColor(lastPt.v)} opacity={0.12} />
            <Circle cx={lastPt.x} cy={lastPt.y} r={13} fill={dotColor(lastPt.v)} opacity={0.2} />
          </>
        )}
      </Svg>

      {/* ── BARRA DE ESTADÍSTICAS ── */}
      {hasData && (
        <View style={{
          flexDirection: 'row', justifyContent: 'space-around', marginTop: 8,
          paddingVertical: 10, paddingHorizontal: 4,
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderRadius: 12, borderWidth: 1, borderColor: border,
        }}>
          {[
            { label: 'Mín',      value: rawValues.length > 0 ? `${Math.min(...rawValues)}` : '—', color: '#EF4444' },
            { label: 'Media',    value: avgVal !== null ? `${avgVal}` : '—', color: dotColor(avgVal ?? 120) },
            { label: 'Máx',      value: rawValues.length > 0 ? `${Math.max(...rawValues)}` : '—', color: '#F59E0B' },
            { label: 'Lecturas', value: `${todayReadings.length}`, color: labelColor },
          ].map(stat => (
            <View key={stat.label} style={{ alignItems: 'center', gap: 2 }}>
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ fontSize: 10 }}>
                {stat.label}
              </DyslexiaText>
              <DyslexiaText variant="body" color={stat.color} style={{ fontWeight: '800', fontSize: 15 }}>
                {stat.value}
              </DyslexiaText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
