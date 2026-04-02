#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const FIGMA_API = "https://api.figma.com/v1";

const server = new McpServer({
  name: "figma",
  version: "1.0.0",
});

function getToken(): string {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error("FIGMA_ACCESS_TOKEN env var is required");
  return token;
}

async function figmaFetch(path: string): Promise<any> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { "X-Figma-Token": getToken() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status}: ${text}`);
  }
  return res.json();
}

// Extract file key from URL or use as-is
function parseFileKey(input: string): string {
  const match = input.match(
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/
  );
  return match ? match[1] : input;
}

// Convert Figma color to CSS
function figmaColorToCSS(color: any, opacity?: number): string {
  if (!color) return "transparent";
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = opacity ?? color.a ?? 1;
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Convert Figma gradient to CSS
function figmaGradientToCSS(fill: any): string {
  if (!fill.gradientStops || !fill.gradientHandlePositions) return "";
  const stops = fill.gradientStops
    .map(
      (stop: any) =>
        `${figmaColorToCSS(stop.color)} ${Math.round(stop.position * 100)}%`
    )
    .join(", ");

  if (fill.type === "GRADIENT_LINEAR") {
    const handles = fill.gradientHandlePositions;
    const angle = Math.round(
      (Math.atan2(handles[1].y - handles[0].y, handles[1].x - handles[0].x) *
        180) /
        Math.PI +
        90
    );
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  if (fill.type === "GRADIENT_RADIAL") {
    return `radial-gradient(${stops})`;
  }
  return `linear-gradient(${stops})`;
}

// Convert Figma effect to CSS
function figmaEffectToCSS(effect: any): string {
  if (!effect.visible) return "";
  const { offset, radius, spread, color } = effect;
  const colorStr = figmaColorToCSS(color);

  if (effect.type === "DROP_SHADOW") {
    return `${offset?.x ?? 0}px ${offset?.y ?? 0}px ${radius ?? 0}px ${spread ?? 0}px ${colorStr}`;
  }
  if (effect.type === "INNER_SHADOW") {
    return `inset ${offset?.x ?? 0}px ${offset?.y ?? 0}px ${radius ?? 0}px ${spread ?? 0}px ${colorStr}`;
  }
  if (effect.type === "LAYER_BLUR") {
    return `blur(${radius}px)`;
  }
  if (effect.type === "BACKGROUND_BLUR") {
    return `backdrop-blur(${radius}px)`;
  }
  return "";
}

// Extract complete CSS specs from a node
function extractNodeCSS(node: any): Record<string, string> {
  const css: Record<string, string> = {};

  // Dimensions
  if (node.absoluteBoundingBox) {
    const { width, height } = node.absoluteBoundingBox;
    css.width = `${Math.round(width)}px`;
    css.height = `${Math.round(height)}px`;
  }

  // Border radius
  if (node.cornerRadius != null) {
    css["border-radius"] = `${node.cornerRadius}px`;
  }
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    css["border-radius"] = `${tl}px ${tr}px ${br}px ${bl}px`;
  }

  // Fills
  if (node.fills?.length) {
    const visibleFills = node.fills.filter((f: any) => f.visible !== false);
    for (const fill of visibleFills) {
      if (fill.type === "SOLID") {
        css["background-color"] = figmaColorToCSS(fill.color, fill.opacity);
      } else if (fill.type?.startsWith("GRADIENT")) {
        css["background"] = figmaGradientToCSS(fill);
      }
    }
  }

  // Strokes
  if (node.strokes?.length) {
    const visibleStrokes = node.strokes.filter((s: any) => s.visible !== false);
    if (visibleStrokes.length && node.strokeWeight) {
      const stroke = visibleStrokes[0];
      const color =
        stroke.type === "SOLID"
          ? figmaColorToCSS(stroke.color, stroke.opacity)
          : "currentColor";
      css["border"] = `${node.strokeWeight}px solid ${color}`;
    }
  }

  // Effects (shadows, blur)
  if (node.effects?.length) {
    const shadows: string[] = [];
    const filters: string[] = [];
    for (const effect of node.effects) {
      if (!effect.visible && effect.visible !== undefined) continue;
      const cssEffect = figmaEffectToCSS(effect);
      if (!cssEffect) continue;
      if (
        effect.type === "DROP_SHADOW" ||
        effect.type === "INNER_SHADOW"
      ) {
        shadows.push(cssEffect);
      } else {
        filters.push(cssEffect);
      }
    }
    if (shadows.length) css["box-shadow"] = shadows.join(", ");
    if (filters.length) css["filter"] = filters.join(" ");
  }

  // Typography
  if (node.style) {
    const s = node.style;
    if (s.fontFamily) css["font-family"] = s.fontFamily;
    if (s.fontSize) css["font-size"] = `${s.fontSize}px`;
    if (s.fontWeight) css["font-weight"] = String(s.fontWeight);
    if (s.lineHeightPx) css["line-height"] = `${Math.round(s.lineHeightPx)}px`;
    if (s.letterSpacing) css["letter-spacing"] = `${s.letterSpacing}px`;
    if (s.textAlignHorizontal)
      css["text-align"] = s.textAlignHorizontal.toLowerCase();
    if (s.textCase === "UPPER") css["text-transform"] = "uppercase";
    if (s.textCase === "LOWER") css["text-transform"] = "lowercase";
    if (s.textDecoration === "UNDERLINE")
      css["text-decoration"] = "underline";
    if (s.textDecoration === "STRIKETHROUGH")
      css["text-decoration"] = "line-through";
  }

  // Text color (from fills on TEXT nodes)
  if (node.type === "TEXT" && node.fills?.length) {
    const fill = node.fills.find(
      (f: any) => f.visible !== false && f.type === "SOLID"
    );
    if (fill) css["color"] = figmaColorToCSS(fill.color, fill.opacity);
  }

  // Padding (auto-layout)
  if (node.paddingLeft != null) css["padding-left"] = `${node.paddingLeft}px`;
  if (node.paddingRight != null)
    css["padding-right"] = `${node.paddingRight}px`;
  if (node.paddingTop != null) css["padding-top"] = `${node.paddingTop}px`;
  if (node.paddingBottom != null)
    css["padding-bottom"] = `${node.paddingBottom}px`;

  // Gap (auto-layout)
  if (node.itemSpacing != null) css["gap"] = `${node.itemSpacing}px`;

  // Layout mode
  if (node.layoutMode === "HORIZONTAL") {
    css["display"] = "flex";
    css["flex-direction"] = "row";
  } else if (node.layoutMode === "VERTICAL") {
    css["display"] = "flex";
    css["flex-direction"] = "column";
  }

  // Alignment
  if (node.primaryAxisAlignItems) {
    const map: Record<string, string> = {
      MIN: "flex-start",
      CENTER: "center",
      MAX: "flex-end",
      SPACE_BETWEEN: "space-between",
    };
    css["justify-content"] = map[node.primaryAxisAlignItems] || "flex-start";
  }
  if (node.counterAxisAlignItems) {
    const map: Record<string, string> = {
      MIN: "flex-start",
      CENTER: "center",
      MAX: "flex-end",
      BASELINE: "baseline",
    };
    css["align-items"] = map[node.counterAxisAlignItems] || "stretch";
  }

  // Opacity
  if (node.opacity != null && node.opacity < 1) {
    css["opacity"] = node.opacity.toFixed(2);
  }

  // Overflow
  if (node.clipsContent) {
    css["overflow"] = "hidden";
  }

  return css;
}

function cssToString(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n");
}

// Recursively summarize a node tree
function summarizeNode(
  node: any,
  depth: number = 0,
  maxDepth: number = 3
): any {
  const summary: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if (node.absoluteBoundingBox) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    summary.bounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  if (node.type === "TEXT") {
    summary.characters = node.characters;
    summary.css = extractNodeCSS(node);
  }

  if (node.fills?.length) {
    summary.fills = node.fills
      .filter((f: any) => f.visible !== false)
      .map((f: any) => ({
        type: f.type,
        color:
          f.type === "SOLID"
            ? figmaColorToCSS(f.color, f.opacity)
            : undefined,
        gradient: f.type?.startsWith("GRADIENT")
          ? figmaGradientToCSS(f)
          : undefined,
      }));
  }

  if (depth < maxDepth && node.children?.length) {
    summary.children = node.children.map((child: any) =>
      summarizeNode(child, depth + 1, maxDepth)
    );
  } else if (node.children?.length) {
    summary.childCount = node.children.length;
  }

  return summary;
}

// ---------- TOOLS ----------

server.tool(
  "get_file_structure",
  "Get the page and frame structure of a Figma file. Use a Figma file URL or file key.",
  { file: z.string().describe("Figma file URL or file key") },
  async ({ file }) => {
    const key = parseFileKey(file);
    const data = await figmaFetch(`/files/${key}?depth=2`);

    const pages = data.document.children.map((page: any) => ({
      id: page.id,
      name: page.name,
      frames: page.children?.map((frame: any) => ({
        id: frame.id,
        name: frame.name,
        type: frame.type,
        bounds: frame.absoluteBoundingBox
          ? {
              width: Math.round(frame.absoluteBoundingBox.width),
              height: Math.round(frame.absoluteBoundingBox.height),
            }
          : undefined,
      })),
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { fileName: data.name, lastModified: data.lastModified, pages },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_node",
  "Get detailed info about a specific Figma node (frame, component, etc.) including all children, styles, and layout. Returns the full node tree with CSS specs.",
  {
    file: z.string().describe("Figma file URL or file key"),
    node_id: z.string().describe("Node ID (e.g., '2:45')"),
    depth: z
      .number()
      .optional()
      .describe("Max depth to traverse children (default 10)"),
  },
  async ({ file, node_id, depth }) => {
    const key = parseFileKey(file);
    const data = await figmaFetch(
      `/files/${key}/nodes?ids=${encodeURIComponent(node_id)}`
    );
    const node = data.nodes[node_id]?.document;
    if (!node) throw new Error(`Node ${node_id} not found`);

    const summary = summarizeNode(node, 0, depth ?? 10);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(summary, null, 2) },
      ],
    };
  }
);

server.tool(
  "get_node_css",
  "Get the exact CSS properties for a specific Figma node — colors, gradients, shadows, typography, layout, spacing. Pixel-perfect specs.",
  {
    file: z.string().describe("Figma file URL or file key"),
    node_id: z.string().describe("Node ID (e.g., '2:45')"),
  },
  async ({ file, node_id }) => {
    const key = parseFileKey(file);
    const data = await figmaFetch(
      `/files/${key}/nodes?ids=${encodeURIComponent(node_id)}`
    );
    const node = data.nodes[node_id]?.document;
    if (!node) throw new Error(`Node ${node_id} not found`);

    const css = extractNodeCSS(node);
    return {
      content: [
        {
          type: "text" as const,
          text: `/* ${node.name} (${node.type}) */\n${cssToString(css)}`,
        },
      ],
    };
  }
);

server.tool(
  "get_styles",
  "Get all published styles (colors, text styles, effects) from a Figma file.",
  { file: z.string().describe("Figma file URL or file key") },
  async ({ file }) => {
    const key = parseFileKey(file);
    const data = await figmaFetch(`/files/${key}/styles`);

    const styles = data.meta?.styles?.map((s: any) => ({
      key: s.key,
      name: s.name,
      type: s.style_type,
      description: s.description,
      nodeId: s.node_id,
    }));

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(styles, null, 2) },
      ],
    };
  }
);

server.tool(
  "get_components",
  "List all components and component sets in a Figma file.",
  { file: z.string().describe("Figma file URL or file key") },
  async ({ file }) => {
    const key = parseFileKey(file);
    const data = await figmaFetch(`/files/${key}/components`);

    const components = data.meta?.components?.map((c: any) => ({
      key: c.key,
      name: c.name,
      description: c.description,
      nodeId: c.node_id,
      containingFrame: c.containing_frame?.name,
    }));

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(components, null, 2) },
      ],
    };
  }
);

server.tool(
  "get_frame_with_css",
  "Get a complete frame/section with full CSS for every element. Best for converting designs to code — returns the entire element tree with pixel-perfect CSS specs, text content, and layout hierarchy.",
  {
    file: z.string().describe("Figma file URL or file key"),
    node_id: z.string().describe("Frame/section node ID"),
  },
  async ({ file, node_id }) => {
    const key = parseFileKey(file);
    const data = await figmaFetch(
      `/files/${key}/nodes?ids=${encodeURIComponent(node_id)}`
    );
    const node = data.nodes[node_id]?.document;
    if (!node) throw new Error(`Node ${node_id} not found`);

    function extractAll(n: any, depth: number = 0): any {
      const result: any = {
        name: n.name,
        type: n.type,
        css: extractNodeCSS(n),
      };

      if (n.type === "TEXT") {
        result.text = n.characters;
      }

      if (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION") {
        result.note = "SVG/icon — export as image or use icon library";
      }

      if (n.absoluteBoundingBox) {
        result.size = {
          width: Math.round(n.absoluteBoundingBox.width),
          height: Math.round(n.absoluteBoundingBox.height),
        };
      }

      if (n.children?.length) {
        result.children = n.children.map((child: any) =>
          extractAll(child, depth + 1)
        );
      }

      return result;
    }

    const tree = extractAll(node);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(tree, null, 2) },
      ],
    };
  }
);

server.tool(
  "export_images",
  "Export Figma nodes as images (PNG, SVG, JPG, PDF). Returns download URLs.",
  {
    file: z.string().describe("Figma file URL or file key"),
    node_ids: z.string().describe("Comma-separated node IDs"),
    format: z
      .enum(["png", "svg", "jpg", "pdf"])
      .optional()
      .describe("Image format (default: png)"),
    scale: z
      .number()
      .optional()
      .describe("Export scale 0.01-4 (default: 2)"),
  },
  async ({ file, node_ids, format, scale }) => {
    const key = parseFileKey(file);
    const fmt = format || "png";
    const s = scale || 2;
    const data = await figmaFetch(
      `/images/${key}?ids=${encodeURIComponent(node_ids)}&format=${fmt}&scale=${s}`
    );

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(data.images, null, 2) },
      ],
    };
  }
);

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
