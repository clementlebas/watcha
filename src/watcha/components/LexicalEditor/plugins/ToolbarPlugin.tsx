import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  $createParagraphNode,
  CAN_REDO_COMMAND, 
  CAN_UNDO_COMMAND, 
  COMMAND_PRIORITY_CRITICAL, 
  FORMAT_TEXT_COMMAND, 
  REDO_COMMAND, 
  UNDO_COMMAND 
} from 'lexical';
import { 
  INSERT_ORDERED_LIST_COMMAND, 
  INSERT_UNORDERED_LIST_COMMAND, 
} from '@lexical/list';
import { 
  $createHeadingNode, 
} from '@lexical/rich-text';
import { 
  $setBlocksType 
} from '@lexical/selection';
import { 
  mergeRegister 
} from '@lexical/utils';
import { 
  useCallback, 
  useEffect, 
  useState,
  useRef
} from 'react';
import { 
  Bold, 
  Italic,
  Underline,
  Code,
  Heading1,
  Heading2,
  Type,
  List, 
  ListOrdered, 
  Undo, 
  Redo, 
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';

// Adjusted imports for absolute structure app/src/watcha/components/LexicalEditor/plugins/
import { Button } from '../../../../components/ui/button';
import { Toggle } from '../../../../components/ui/toggle';
import { Separator } from '../../../../components/ui/separator';
import { $createImageNode } from '../nodes/ImageNode';
import { uploadFileWithProgress, validateFile, type FileWithValidType } from '../../../../file-upload/fileUploading';

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsCode(selection.hasFormat('code'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, $updateToolbar]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError.message);
      return;
    }

    setIsUploading(true);
    try {
      // Use the key returned from our updated uploadFileWithProgress
      const { key } = await uploadFileWithProgress({
        file: file as FileWithValidType,
        setUploadProgressPercent: (percentage: number) => console.log(`Upload progress: ${percentage}%`),
      });

      // Insert image node with the correct S3 key
      editor.update(() => {
        const imageNode = $createImageNode({ fileKey: key, altText: file.name });
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([imageNode]);
          // Focus after insert
          selection.insertParagraph();
        }
      });
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-900 border-b-2 border-zinc-900 dark:border-zinc-100 sticky top-0 z-10 overflow-x-auto">
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canUndo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          className="h-8 w-8 p-0"
        >
          <Undo className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canRedo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          className="h-8 w-8 p-0"
        >
          <Redo className="size-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-300 dark:bg-zinc-700 shadow-none border-none" />

      <div className="flex items-center gap-1 shrink-0">
        <Toggle
          size="sm"
          pressed={isBold}
          onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          className="h-8 px-2.5 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-950 font-bold"
        >
          <Bold className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={isItalic}
          onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
          className="h-8 px-2.5 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-950"
        >
          <Italic className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={isUnderline}
          onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
          className="h-8 px-2.5 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-950"
        >
          <Underline className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={isCode}
          onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
          className="h-8 px-2.5 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-950"
        >
          <Code className="size-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-300 dark:bg-zinc-700 shadow-none border-none" />

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode('h1'));
              }
            });
          }}
          className="h-8 px-2.5 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <Heading1 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode('h2'));
              }
            });
          }}
          className="h-8 px-2.5 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createParagraphNode());
              }
            });
          }}
          className="h-8 px-2.5 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <Type className="size-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-300 dark:bg-zinc-700 shadow-none border-none" />

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
          className="h-8 px-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
          className="h-8 px-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <ListOrdered className="size-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-300 dark:bg-zinc-700 shadow-none border-none" />

      <div className="flex items-center gap-1 shrink-0">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageUpload}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 gap-2 font-semibold"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          <span>Image</span>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 bg-zinc-300 dark:bg-zinc-700 shadow-none border-none" />

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => console.log("IA: Reformuler")}
          className="h-8 px-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 gap-2 font-semibold text-primary"
        >
          <Sparkles className="size-4" />
          <span>Reformuler</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => console.log("IA: Corriger")}
          className="h-8 px-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 gap-2 font-semibold text-primary"
        >
          <Wand2 className="size-4" />
          <span>Corriger</span>
        </Button>
      </div>
    </div>
  );
}
