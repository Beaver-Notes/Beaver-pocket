import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NodeViewWrapperProps, NodeViewWrapper } from '@tiptap/react';
import { v4 as uuid } from 'uuid';
import * as d3 from 'd3';

interface ComponentProps extends NodeViewWrapperProps {
  node: any;
  updateAttributes: (attributes: any) => void;
}

const Paper: React.FC<ComponentProps> = ({ node, updateAttributes }) => {
  const svgRef = useRef<SVGSVGElement>(null!);
  const [color, setColor] = useState<string>('#A975FF');
  const [size, setSize] = useState<number>(Math.ceil(Math.random() * 10));
  const [drawing, setDrawing] = useState<boolean>(false);
  const [id, setId] = useState<string>(uuid());

  const pathRef = useRef<d3.Selection<SVGPathElement, [number, number][], null, undefined> | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);

    const onStartDrawing = (
      event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
    ) => {
      setDrawing(true);
      pathRef.current = createPath(svg);
      const initialPoint = d3.pointers(event)[0];
      pathRef.current!.data([[initialPoint]]);
      svg.on(
        event.type === "mousedown" ? "mousemove" : "touchmove",
        onMove as any
      );
    };

    const onMove = (
      event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
    ) => {
      event.preventDefault();
      const currentPath = pathRef.current;
      if (currentPath) {
        const updatedPoints = [...currentPath.data()[0], d3.pointers(event)[0]];
        currentPath.data([updatedPoints]);
        tick();
      }
    };

    const onEndDrawing = () => {
      svg.on("mousemove", null);
      svg.on("touchmove", null);

      if (!drawing) {
        return;
      }

      setDrawing(false);
      if (pathRef.current) {
        pathRef.current.remove();
      }
      setId(uuid());
    };

    svg
      .on('mousedown', onStartDrawing as any)
      .on('mouseup', onEndDrawing as any)
      .on('mouseleave', onEndDrawing as any)
      .on('touchstart', onStartDrawing as any)
      .on('touchend', onEndDrawing as any)
      .on('touchleave', onEndDrawing as any);

    return () => {
      svg
        .on('mousedown', null)
        .on('mouseup', null)
        .on('mouseleave', null)
        .on('touchstart', null)
        .on('touchend', null)
        .on('touchleave', null);
    };
  }, [drawing]);

  const createPath = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  ): d3.Selection<SVGPathElement, [number, number][], null, undefined> => {
    return svg.append<SVGPathElement>('path')
      .data<[number, number][]>([[]])  // Explicitly specify the data type as [number, number][]
      .attr('id', `id-${id}`)
      .attr('stroke', color)
      .attr('stroke-width', size)
      .attr('fill', 'none');
  };
  
  const tick = useCallback(() => {
    requestAnimationFrame(() => {
      const currentPath = pathRef.current;
      if (currentPath) {
        const updatedPoints = currentPath.data()[0];
        currentPath.attr('d', d3.line<[number, number]>().curve(d3.curveBasis)(updatedPoints));
        const lines = node.attrs.lines.filter((item: any) => item.id !== id);

        // Delaying the updateAttributes call to avoid infinite loop
        setTimeout(() => {
          updateAttributes({
            lines: [
              ...lines,
              {
                id,
                color,
                size,
                path: currentPath.attr('d') || '',
              },
            ],
          });
        }, 0);
      }
    });
  }, [node.attrs.lines, updateAttributes, id, color, size]);

  const clear = () => {
    updateAttributes({
      lines: [],
    });
  };

  return (
    <NodeViewWrapper className="paper-block-node-view">
      <div className="draw" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ marginBottom: '8px' }} />
        <input type="number" min="1" max="10" value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ marginBottom: '8px' }} />
        <button onClick={clear} style={{ marginBottom: '8px' }}>Clear</button>
        <svg viewBox="0 0 500 250" ref={svgRef} style={{ border: '1px solid #ccc' }}>
          {node.attrs.lines.map((item: any) => (
            item.id !== id && (
              <path
                key={item.id}
                d={item.path}
                id={`id-${item.id}`}
                stroke={item.color}
                strokeWidth={item.size}
                fill="none" // Set fill to none
              />
            )
          ))}
        </svg>
      </div>
    </NodeViewWrapper>
  );
};

export default Paper;
