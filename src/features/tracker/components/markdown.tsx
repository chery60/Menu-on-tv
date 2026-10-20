import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { docHrefForFile } from '../docs/links';

interface MarkdownProps {
  readonly source: string;
  readonly className?: string;
}

const components: Components = {
  a: ({ href, children }) => {
    const internal = href ? docHrefForFile(href) : null;
    if (internal) return <a href={internal}>{children}</a>;
    const external = href?.startsWith('http');
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
};

/** Renders trusted repo Markdown and item bodies. Raw HTML is not rendered. */
export function Markdown({ source, className }: MarkdownProps) {
  return (
    <div className={`doc-prose ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
