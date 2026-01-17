import React, { useRef, useCallback, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Link, 
  List, 
  ListOrdered, 
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { Button } from './button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './tooltip';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon, title, onClick, active }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            active && "bg-accent text-accent-foreground"
          )}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent losing focus/selection
          }}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  )
);
ToolbarButton.displayName = 'ToolbarButton';

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  minHeight = "80px",
  className
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    // Trigger onChange after command execution
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleLink = useCallback(() => {
    const url = prompt('Введите URL ссылки:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Sync value prop to editor content
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  return (
    <div className={cn("border border-input rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b border-input bg-muted/30 flex-wrap">
        <ToolbarButton
          icon={<Bold className="h-4 w-4" />}
          title="Жирный"
          onClick={() => execCommand('bold')}
        />
        <ToolbarButton
          icon={<Italic className="h-4 w-4" />}
          title="Курсив"
          onClick={() => execCommand('italic')}
        />
        <ToolbarButton
          icon={<Underline className="h-4 w-4" />}
          title="Подчёркнутый"
          onClick={() => execCommand('underline')}
        />
        <ToolbarButton
          icon={<Strikethrough className="h-4 w-4" />}
          title="Зачёркнутый"
          onClick={() => execCommand('strikeThrough')}
        />
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton
          icon={<Link className="h-4 w-4" />}
          title="Ссылка"
          onClick={handleLink}
        />
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton
          icon={<ListOrdered className="h-4 w-4" />}
          title="Нумерованный список"
          onClick={() => execCommand('insertOrderedList')}
        />
        <ToolbarButton
          icon={<List className="h-4 w-4" />}
          title="Маркированный список"
          onClick={() => execCommand('insertUnorderedList')}
        />
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton
          icon={<AlignLeft className="h-4 w-4" />}
          title="По левому краю"
          onClick={() => execCommand('justifyLeft')}
        />
        <ToolbarButton
          icon={<AlignCenter className="h-4 w-4" />}
          title="По центру"
          onClick={() => execCommand('justifyCenter')}
        />
        <ToolbarButton
          icon={<AlignRight className="h-4 w-4" />}
          title="По правому краю"
          onClick={() => execCommand('justifyRight')}
        />
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton
          icon={<RemoveFormatting className="h-4 w-4" />}
          title="Очистить форматирование"
          onClick={() => execCommand('removeFormat')}
        />
      </div>
      
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        className={cn(
          "px-3 py-2 text-sm bg-background focus:outline-none",
          // Basic rich-text styling (Tailwind reset removes list markers by default)
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
          "[&_li]:my-1",
          "[&_a]:text-primary [&_a]:underline",
          "[&_b]:font-semibold [&_strong]:font-semibold",
          "[&_i]:italic [&_em]:italic",
          "[&_u]:underline",
          "[&_s]:line-through",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none"
        )}
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />
    </div>
  );
};
