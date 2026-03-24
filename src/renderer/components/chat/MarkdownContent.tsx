/**
 * MarkdownContent - 渲染 Markdown 文本，代码块语法高亮
 * 参考 design_v2.html 代码块样式
 */
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { invokeIpc } from '@/lib/api-client';
import { extractFilePathsFromText } from '@/pages/Chat/message-utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="ml-2">{children}</li>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = !!match;
    if (isBlock) {
      const lang = match[1];
      const code = String(children).replace(/\n$/, '');
      return (
        <CodeBlock lang={lang} code={code} />
      );
    }
    return (
      <code className="bg-white/10 px-1 rounded text-xs" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  a: ({ href, children }) => {
    const isFileLink = typeof href === 'string' && href.startsWith('file://');
    const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isFileLink || !href) return;
      e.preventDefault();
      try {
        const filePath = decodeURIComponent(href.replace(/^file:\/\//, ''));
        await invokeIpc('shell:openPath', filePath);
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    };
    return (
      <a
        href={href}
        onClick={handleClick}
        target={isFileLink ? undefined : '_blank'}
        rel={isFileLink ? undefined : 'noopener noreferrer'}
        className="text-blue-400 hover:underline"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg mt-2 overflow-hidden">
      <div className="bg-[#161b22] px-3 py-1.5 flex justify-between items-center border-b border-[#30363d]">
        <span className="text-[11px] text-[#8b949e]">{lang}</span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] text-[#58a6ff] hover:text-[#79c0ff] bg-transparent border-none cursor-pointer"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={dark}
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          background: '#0d1117',
          fontSize: '13px',
          lineHeight: 1.5,
          maxWidth: '100%',
          overflowX: 'auto',
        }}
        codeTagProps={{
          style: {
            fontFamily: "'SF Mono', 'Cascadia Code', Consolas, monospace",
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          },
        }}
        showLineNumbers={false}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!content?.trim()) return '';
    const paths = Array.from(new Set(extractFilePathsFromText(content))).sort((a, b) => b.length - a.length);
    if (!paths.length) return content;

    let out = content;
    for (const p of paths) {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'g');
      const href = `file://${encodeURIComponent(p).replace(/%2F/g, '/')}`;
      out = out.replace(re, `[${p}](${href})`);
    }
    return out;
  }, [content]);

  if (!renderedContent.trim()) return null;
  return (
    <div className={`markdown-content prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
};
