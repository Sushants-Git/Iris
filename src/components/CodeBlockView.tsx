import { useState } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import type { NodeViewProps } from '@tiptap/react'

export function CodeBlockView({ node }: NodeViewProps) {
  const language = node.attrs.language || 'plaintext'
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = node.textContent
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <NodeViewWrapper className="t3-code-block">
      <div className="t3-code-header" contentEditable={false}>
        <span className="t3-code-lang">{language}</span>
        <button className="t3-code-copy" onClick={handleCopy} title="Copy">
          {copied
            ? <Check className="w-3.5 h-3.5" />
            : <Copy className="w-3.5 h-3.5" />
          }
        </button>
      </div>
      <pre className={`language-${language}`}>
        <NodeViewContent className={`language-${language}`} />
      </pre>
    </NodeViewWrapper>
  )
}
