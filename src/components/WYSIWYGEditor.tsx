import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkdown(editor: any): string {
  return editor?.storage?.markdown?.getMarkdown?.() ?? ''
}

export function WYSIWYGEditor({ value, onChange, placeholder, className, autoFocus }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'wysiwyg-editor outline-none min-h-[200px] px-4 py-3 text-sm leading-relaxed',
          className ?? '',
        ),
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(getMarkdown(editor))
    },
    autofocus: autoFocus ? 'end' : false,
    immediatelyRender: false,
  })

  // Sync value in if it changes externally (e.g. modal opened for different entry)
  useEffect(() => {
    if (!editor) return
    const current = getMarkdown(editor)
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  return <EditorContent editor={editor} />
}
