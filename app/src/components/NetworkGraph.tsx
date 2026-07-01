import { useEffect, useRef, useState } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';

export interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  radius?: number;
  flagged?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  color?: string;
  dashed?: boolean;
}

interface SimNode extends GraphNode, SimulationNodeDatum {}
interface SimLink extends SimulationLinkDatum<SimNode> {
  color?: string;
  dashed?: boolean;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick?: (id: string) => void;
}

const FULL_R = 30;
const COMPACT_R = 20;
const PAD = 40;

export default function NetworkGraph({ nodes, links, width = 760, height = 520, onNodeClick }: Props) {
  const compact = nodes.length > 50;
  const DEFAULT_R = compact ? COMPACT_R : FULL_R;

  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const linksRef = useRef<SimLink[]>([]);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const panRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);

  useEffect(() => {
    const spread = compact ? Math.min(width, height) * 0.42 : 150;
    const initial: SimNode[] = nodes.map((n, i) => {
      const prev = simRef.current?.nodes().find((p) => p.id === n.id);
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      return {
        ...n,
        x: prev?.x ?? width / 2 + Math.cos(angle) * spread,
        y: prev?.y ?? height / 2 + Math.sin(angle) * spread,
        fx: prev?.fx, fy: prev?.fy,
      };
    });

    const linkObjs: SimLink[] = links.map((l) => ({ source: l.source, target: l.target, color: l.color, dashed: l.dashed }));
    linksRef.current = linkObjs;

    const clamp = (v: number, max: number) => Math.max(PAD, Math.min(max - PAD, v));

    // Charge and distances tuned for graph density
    const charge = compact ? -80 - (2000 / Math.max(nodes.length, 1)) : -220;
    const linkDist = compact ? 75 : 120;
    const decay = compact ? 0.055 : 0.035;

    const sim = forceSimulation(initial)
      .force('link', forceLink<SimNode, SimLink>(linkObjs).id((d) => d.id).distance(linkDist).strength(0.6))
      .force('charge', forceManyBody().strength(charge))
      .force('x', forceX(width / 2).strength(0.07))
      .force('y', forceY(height / 2).strength(0.07))
      .force('collide', forceCollide<SimNode>((d) => (d.radius || DEFAULT_R) + (compact ? 8 : 16)))
      .alpha(1)
      .alphaDecay(decay);

    sim.on('tick', () => {
      sim.nodes().forEach((n) => {
        n.x = clamp(n.x ?? width / 2, width);
        n.y = clamp(n.y ?? height / 2, height);
      });
      setSimNodes([...sim.nodes()]);
    });
    simRef.current = sim;
    setSimNodes([...sim.nodes()]);

    return () => { sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.map((n) => n.id).join(','), links.map((l) => l.source + '>' + l.target).join(',')]);

  function screenToWorld(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = (clientX - rect.left - view.x) / view.k;
    const sy = (clientY - rect.top - view.y) / view.k;
    return { x: sx, y: sy };
  }

  function onNodePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    dragRef.current = { id, pointerId: e.pointerId };
    (e.target as Element).setPointerCapture(e.pointerId);
    const node = simRef.current?.nodes().find((n) => n.id === id);
    if (node) { node.fx = node.x; node.fy = node.y; }
    simRef.current?.alphaTarget(0.3).restart();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const node = simRef.current?.nodes().find((n) => n.id === dragRef.current!.id);
      if (node) {
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        node.fx = x; node.fy = y;
      }
      return;
    }
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setView((v) => ({ ...v, x: panRef.current!.viewX + dx, y: panRef.current!.viewY + dy }));
    }
  }

  function onPointerUp() {
    if (dragRef.current) {
      simRef.current?.alphaTarget(0);
      dragRef.current = null;
    }
    panRef.current = null;
  }

  function onBackgroundPointerDown(e: React.PointerEvent) {
    panRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(3.0, Math.max(0.22, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    setView((v) => ({ ...v, k: next }));
  }

  const labelY = compact ? 3 : -2;
  const labelSize = compact ? 9 : 11;
  const sublabelSize = compact ? 8 : 10;
  const sublabelGap = compact ? 12 : 16;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', cursor: panRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    >
      <defs>
        <marker id="ng-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.25)" />
        </marker>
      </defs>
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        {linksRef.current.map((l, i) => {
          const a = typeof l.source === 'object' ? (l.source as SimNode) : undefined;
          const b = typeof l.target === 'object' ? (l.target as SimNode) : undefined;
          if (!a || !b || a.x == null || b.x == null) return null;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={l.color || 'rgba(255,255,255,0.18)'}
              strokeWidth={compact ? 1 : (l.color ? 2 : 1.5)}
              strokeDasharray={l.dashed ? '5,5' : undefined}
              markerEnd="url(#ng-arrow)"
            />
          );
        })}
        {simNodes.map((n) => {
          const r = n.radius || DEFAULT_R;
          // In compact mode, only show sublabel on flagged nodes to reduce clutter
          const showSublabel = !compact || n.flagged;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
              style={{ cursor: onNodeClick ? 'pointer' : 'grab' }}
              onPointerDown={(e) => onNodePointerDown(e, n.id)}
              onClick={() => onNodeClick?.(n.id)}
            >
              <circle
                r={r}
                fill={n.flagged ? 'rgba(242,104,95,0.16)' : 'rgba(255,255,255,0.04)'}
                stroke={n.flagged ? '#f2685f' : n.color}
                strokeWidth={n.flagged ? (compact ? 2 : 3) : (compact ? 1.2 : 2)}
              />
              <text textAnchor="middle" y={labelY} fontFamily="JetBrains Mono, monospace" fontSize={labelSize} fontWeight={600} fill={n.flagged ? '#f2685f' : n.color}>
                {n.label}
              </text>
              {showSublabel && n.sublabel && (
                <text textAnchor="middle" y={r + sublabelGap} fontFamily="JetBrains Mono, monospace" fontSize={sublabelSize} fill="#9fb3a9">
                  {n.sublabel.length > 14 ? n.sublabel.slice(0, 13) + '…' : n.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
