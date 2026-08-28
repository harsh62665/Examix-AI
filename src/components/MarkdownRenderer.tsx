import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Code2, Sparkles } from 'lucide-react';
import { VideoSceneCard } from './VideoSceneCard';
import { WhiteboardPlayer } from './WhiteboardPlayer';
import { ManimAnimationCard } from './ManimAnimationCard';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Clean and sanitize raw SVG strings to prevent unsafe scripts while preserving full graphic tags & attributes
function sanitizeSvg(svgStr: string): string {
  return svgStr
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '');
}

interface ContentBlock {
  type: 'markdown' | 'svg' | 'video_scene' | 'whiteboard' | 'next_steps';
  content: string;
}

function parseBlocks(rawText: string): ContentBlock[] {
  if (!rawText) return [];

  // Match:
  // 1. Complete <svg ... </svg>
  // 2. [VIDEO_SCENE: ...] or [VIDEO_SCENE]...[/VIDEO_SCENE]
  // 3. [WHITEBOARD_SEQUENCE]...[/WHITEBOARD_SEQUENCE]
  // 4. [NEXT_STEPS]...[/NEXT_STEPS]
  const pattern = /(<svg[\s\S]*?<\/svg>|\[VIDEO_SCENE:[\s\S]*?\]|\[VIDEO_SCENE\][\s\S]*?\[\/VIDEO_SCENE\]|\[WHITEBOARD_SEQUENCE\][\s\S]*?\[\/WHITEBOARD_SEQUENCE\]|\[NEXT_STEPS\][\s\S]*?\[\/NEXT_STEPS\])/gi;
  const parts = rawText.split(pattern);
  const blocks: ContentBlock[] = [];

  for (const part of parts) {
    if (!part) continue;
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith('<svg') && trimmed.toLowerCase().endsWith('</svg>')) {
      blocks.push({ type: 'svg', content: trimmed });
    } else if (
      trimmed.toUpperCase().startsWith('[VIDEO_SCENE:') ||
      (trimmed.toUpperCase().startsWith('[VIDEO_SCENE]') && trimmed.toUpperCase().endsWith('[/VIDEO_SCENE]'))
    ) {
      blocks.push({ type: 'video_scene', content: trimmed });
    } else if (
      trimmed.toUpperCase().startsWith('[WHITEBOARD_SEQUENCE]') &&
      trimmed.toUpperCase().endsWith('[/WHITEBOARD_SEQUENCE]')
    ) {
      blocks.push({ type: 'whiteboard', content: trimmed });
    } else if (
      trimmed.toUpperCase().startsWith('[NEXT_STEPS]') &&
      trimmed.toUpperCase().endsWith('[/NEXT_STEPS]')
    ) {
      blocks.push({ type: 'next_steps', content: trimmed });
    } else {
      blocks.push({ type: 'markdown', content: part });
    }
  }

  return blocks;
}

// Component to render code blocks with a clean copy button and Manim animation integration
function CodeBlock({ node, inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1].toLowerCase() : '';
  const textContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-300" {...props}>
        {children}
      </code>
    );
  }

  // If code block is an svg block written in code fences, render it cleanly
  if ((lang === 'svg' || lang === 'xml') && textContent.trim().startsWith('<svg') && textContent.trim().endsWith('</svg>')) {
    return (
      <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F11]/90 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-4 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <Sparkles size={14} /> Intuitive Diagram
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied SVG' : 'Copy SVG'}</span>
          </button>
        </div>
        <div 
          className="flex justify-center p-6 overflow-x-auto text-white [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(textContent) }}
        />
      </div>
    );
  }

  // If code block is Manim Python Animation script
  if (lang === 'manim' || (lang === 'python' && (textContent.includes('from manim import') || textContent.includes('import manim') || textContent.includes('Scene(')))) {
    return <ManimAnimationCard code={textContent} />;
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0F0F11] shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3.5 py-1.5 text-xs text-gray-400">
        <span className="flex items-center gap-1.5 font-mono text-gray-300">
          <Code2 size={13} className="text-blue-400" />
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs text-gray-200 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`markdown-body space-y-3 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'svg') {
          return (
            <div
              key={`svg-${index}`}
              className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F11]/90 backdrop-blur-md shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-4 py-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <Sparkles size={14} /> Visual Diagram
                </span>
                <span className="text-[11px] text-gray-500 font-mono">SVG Vector</span>
              </div>
              <div
                className="flex justify-center p-6 overflow-x-auto text-white [&>svg]:max-w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(block.content) }}
              />
            </div>
          );
        }

        if (block.type === 'video_scene') {
          return <VideoSceneCard key={`video-scene-${index}`} promptText={block.content} />;
        }

        if (block.type === 'whiteboard') {
          return <WhiteboardPlayer key={`whiteboard-${index}`} rawSequenceText={block.content} />;
        }

        if (block.type === 'next_steps') {
          // Handled natively by interactive prompt pills in the message container
          return null;
        }

        return (
          <div key={`md-${index}`}>
            <Markdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: CodeBlock,
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline hover:text-emerald-300 font-medium"
                    {...props}
                  >
                    {children}
                  </a>
                ),
                table: ({ children, ...props }) => (
                  <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                    <table className="w-full text-left text-xs text-gray-300 divide-y divide-white/10" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th className="bg-white/5 px-3 py-2 font-semibold text-gray-200" {...props}>
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td className="px-3 py-2 border-t border-white/5" {...props}>
                    {children}
                  </td>
                ),
                img: ({ src, alt, ...props }) => (
                  <span className="my-4 block overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-xl max-w-2xl mx-auto">
                    <img
                      src={src}
                      alt={alt || 'Visual Diagram'}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-auto max-h-[500px] object-contain rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
                      {...props}
                    />
                    {alt && alt !== 'image' && (
                      <span className="block px-4 py-2 text-center text-xs text-gray-400 border-t border-white/5 bg-white/[0.02]">
                        {alt}
                      </span>
                    )}
                  </span>
                )
              }}
            >
              {block.content}
            </Markdown>
          </div>
        );
      })}
    </div>
  );
}
