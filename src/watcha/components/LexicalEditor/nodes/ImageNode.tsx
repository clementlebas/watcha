import { 
  DecoratorNode, 
  NodeKey, 
  SerializedLexicalNode, 
  Spread, 
  LexicalNode, 
  DOMConversionMap, 
  DOMConversionOutput, 
  DOMExportOutput,
  LexicalEditor
} from 'lexical';
import { ReactNode } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getDownloadFileSignedURL } from 'wasp/client/operations';
import { ImageIcon } from 'lucide-react';

export type SerializedImageNode = Spread<
  {
    fileKey: string;
    altText: string;
  },
  SerializedLexicalNode
>;

function ImageComponent({ fileKey, altText }: { fileKey: string; altText: string }): ReactNode {
  const { data: downloadUrl, isLoading, error } = useQuery(getDownloadFileSignedURL, { key: fileKey });

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700">
        <ImageIcon className="size-8 text-zinc-400" />
      </div>
    );
  }

  if (error || !downloadUrl) {
    return (
      <div className="w-full p-4 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg text-sm">
        Failed to load image: {fileKey}
      </div>
    );
  }

  return (
    <div className="my-6 group relative">
      <img
        src={downloadUrl}
        alt={altText}
        className="max-w-full rounded-md border-2 border-zinc-900 shadow-[4px_4px_0px_#18181b] block mx-auto"
      />
    </div>
  );
}

export class ImageNode extends DecoratorNode<ReactNode> {
  __fileKey: string;
  __altText: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__fileKey, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { fileKey, altText } = serializedNode;
    const node = $createImageNode({ fileKey, altText });
    return node;
  }

  exportJSON(): SerializedImageNode {
    return {
      fileKey: this.__fileKey,
      altText: this.__altText,
      type: 'image',
      version: 1,
    };
  }

  constructor(fileKey: string, altText: string, key?: NodeKey) {
    super(key);
    this.__fileKey = fileKey;
    this.__altText = altText;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__fileKey); // Simplified for export, will need backend logic to handle re-signing or public access
    element.setAttribute('alt', this.__altText);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    span.style.width = '100%';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactNode {
    return <ImageComponent fileKey={this.__fileKey} altText={this.__altText} />;
  }
}

function $convertImageElement(domNode: Node): DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { src: fileKey, alt: altText } = domNode;
    const node = $createImageNode({ fileKey, altText });
    return { node };
  }
  return { node: null };
}

export function $createImageNode({
  fileKey,
  altText,
}: {
  fileKey: string;
  altText: string;
}): ImageNode {
  return new ImageNode(fileKey, altText);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
