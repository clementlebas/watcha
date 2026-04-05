import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  LexicalTypeaheadMenuPlugin, 
  MenuOption, 
  useBasicTypeaheadTriggerMatch 
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { 
  $createHeadingNode, 
} from '@lexical/rich-text';
import { 
  $setBlocksType 
} from '@lexical/selection';
import { 
  INSERT_UNORDERED_LIST_COMMAND, 
} from '@lexical/list';
import { 
  $getSelection, 
  $isRangeSelection, 
  $createParagraphNode,
  TextNode
} from 'lexical';
import { 
  Heading1, 
  Heading2, 
  List, 
  Type,
} from 'lucide-react';
import { 
  useMemo, 
  useState, 
  JSX
} from 'react';
import { createPortal } from 'react-dom';

class SlashMenuItem extends MenuOption {
  label: string;
  onSelect: (queryString: string) => void;

  constructor(title: string, icon: JSX.Element, onSelect: (queryString: string) => void) {
    super(title);
    this.title = title;
    this.label = title;
    this.icon = icon;
    this.onSelect = onSelect;
  }
}

function SlashMenuOption({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: SlashMenuItem;
}) {
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={`
        flex items-center gap-3 px-3 py-2 cursor-pointer text-sm font-medium
        ${isSelected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'text-zinc-600 dark:text-zinc-400'}
        hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-sm
      `}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-selection-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        {option.icon}
      </span>
      <span>{option.label}</span>
    </li>
  );
}

export default function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const triggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const options = useMemo(() => {
    const baseOptions = [
      new SlashMenuItem('Titre 1', <Heading1 size={18} />, () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'));
          }
        });
      }),
      new SlashMenuItem('Titre 2', <Heading2 size={18} />, () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'));
          }
        });
      }),
      new SlashMenuItem('Texte', <Type size={18} />, () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
      }),
      new SlashMenuItem('Liste à puces', <List size={18} />, () => {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      }),
    ];

    if (!queryString) return baseOptions;

    return baseOptions.filter((option) =>
      option.label.toLowerCase().includes(queryString.toLowerCase())
    );
  }, [editor, queryString]);

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={(selectedOption, nodeToRemove, closeMenu, matchingString) => {
        editor.update(() => {
          if (nodeToRemove) {
            nodeToRemove.remove();
          }
          (selectedOption as SlashMenuItem).onSelect(matchingString);
          closeMenu();
        });
      }}
      triggerFn={triggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) =>
        anchorElementRef.current && options.length
          ? createPortal(
              <div 
                className={`
                  fixed z-50 w-56 p-1
                  bg-white dark:bg-zinc-950 
                  border-2 border-zinc-900 dark:border-zinc-100
                  rounded-none
                `}
                style={{
                  top: anchorElementRef.current.getBoundingClientRect().bottom + 8,
                  left: anchorElementRef.current.getBoundingClientRect().left,
                }}
              >
                <ul className="flex flex-col gap-0.5">
                  {options.map((option, index) => (
                    <SlashMenuOption
                      key={option.key}
                      index={index}
                      isSelected={selectedIndex === index}
                      onClick={() => selectOptionAndCleanUp(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      option={option as SlashMenuItem}
                    />
                  ))}
                </ul>
              </div>,
              document.body
            )
          : null
      }
    />
  );
}
