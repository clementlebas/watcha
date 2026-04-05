import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { $getRoot, LexicalEditor, $createParagraphNode, $createTextNode } from 'lexical';
import { useMemo, useRef } from 'react';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

// Plugins
import ToolbarPlugin from './plugins/ToolbarPlugin';
import SlashMenuPlugin from './plugins/SlashMenuPlugin';
import ImagePlugin from './plugins/ImagePlugin';
import { ImageNode } from './nodes/ImageNode';

const theme = {
  paragraph: 'mb-4 text-zinc-900 dark:text-zinc-50 leading-relaxed text-lg',
  heading: {
    h1: 'text-4xl font-extrabold mb-6 mt-8 text-zinc-950 dark:text-zinc-50 tracking-tight',
    h2: 'text-3xl font-bold mb-4 mt-6 text-zinc-900 dark:text-zinc-100 tracking-tight',
  },
  list: {
    ul: 'list-disc ml-8 my-4 space-y-2',
    ol: 'list-decimal ml-8 my-4 space-y-2',
    listitem: 'text-zinc-900 dark:text-zinc-50',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-sm border border-zinc-200 dark:border-zinc-700 text-rose-500',
  },
};

interface NotionEditorProps {
  onChange?: (content: string) => void;
  initialValue?: string;
}

export const NotionEditor = ({ onChange, initialValue }: NotionEditorProps) => {
  const onChangeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const initialConfig = useMemo(() => {
    return {
      namespace: 'NotionEditor',
      theme,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, ImageNode],
      onError: (error: Error) => {
        console.error(error);
      },
      editorState: (editor: LexicalEditor) => {
        if (initialValue) {
          try {
            const state = editor.parseEditorState(initialValue);
            editor.setEditorState(state);
          } catch (e) {
            editor.update(() => {
              const root = $getRoot();
              const p = $createParagraphNode();
              p.append($createTextNode(initialValue));
              root.append(p);
            });
          }
        }
      },
    };
  }, [initialValue]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="flex flex-col bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-200 overflow-hidden">
        <LexicalComposer initialConfig={initialConfig}>
          <ToolbarPlugin />

          <div className="relative p-8 md:p-12">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="outline-none min-h-[300px] h-auto resize-y overflow-y-auto text-zinc-900 dark:text-zinc-50 prose prose-zinc dark:prose-invert max-w-none" />
              }
              placeholder={
                <div className="absolute top-[2rem] md:top-[3rem] left-[2rem] md:left-[3rem] pointer-events-none text-zinc-400 dark:text-zinc-600 italic text-lg select-none">
                  Type '/' for commands...
                </div>
              }
              ErrorBoundary={({ children }) => <>{children}</>}
            />

            <SlashMenuPlugin />
            <ImagePlugin />
            <HistoryPlugin />
            <ListPlugin />
            <TabIndentationPlugin />

            <OnChangePlugin
              ignoreSelectionChange={true}
              onChange={(editorState) => {
                if (onChangeTimerRef.current) clearTimeout(onChangeTimerRef.current);
                onChangeTimerRef.current = setTimeout(() => {
                  const json = JSON.stringify(editorState.toJSON());
                  if (onChange) onChange(json);
                }, 300);
              }}
            />
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
};

export default NotionEditor;