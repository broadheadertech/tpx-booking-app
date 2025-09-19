import React, { useState, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link,
  Image,
  Code,
  Type,
  RotateCcw
} from 'lucide-react'

const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Write your content here...',
  className = '',
  rows = 8
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef(null)

  const executeCommand = (command, value = null) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value || textarea.value.substring(start, end)
    
    let newText = ''
    let newCursorPos = start

    switch (command) {
      case 'bold':
        newText = `**${selectedText}**`
        newCursorPos = start + 2
        break
      case 'italic':
        newText = `*${selectedText}*`
        newCursorPos = start + 1
        break
      case 'underline':
        newText = `<u>${selectedText}</u>`
        newCursorPos = start + 3
        break
      case 'link':
        const url = prompt('Enter URL:')
        if (url) {
          newText = `[${selectedText}](${url})`
          newCursorPos = start + 1
        } else {
          return
        }
        break
      case 'image':
        const imageUrl = prompt('Enter image URL:')
        if (imageUrl) {
          newText = `![${selectedText}](${imageUrl})`
          newCursorPos = start + 2
        } else {
          return
        }
        break
      case 'list':
        const lines = selectedText.split('\n')
        newText = lines.map(line => line.trim() ? `- ${line}` : line).join('\n')
        newCursorPos = start + 2
        break
      case 'code':
        newText = `\`${selectedText}\``
        newCursorPos = start + 1
        break
      default:
        return
    }

    const newValue = 
      textarea.value.substring(0, start) + 
      newText + 
      textarea.value.substring(end)
    
    onChange(newValue)
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length)
    }, 0)
  }

  const insertAtCursor = (text) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = 
      textarea.value.substring(0, start) + 
      text + 
      textarea.value.substring(end)
    
    onChange(newValue)
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  const ToolbarButton = ({ command, icon: Icon, tooltip, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="p-2 hover:bg-[#333333] rounded text-gray-400 hover:text-white transition-colors group relative"
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className={`bg-[#1A1A1A] border border-[#444444] rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center space-x-1 p-2 bg-[#222222] border-b border-[#444444]">
        <ToolbarButton
          command="bold"
          icon={Bold}
          tooltip="Bold"
          onClick={() => executeCommand('bold')}
        />
        <ToolbarButton
          command="italic"
          icon={Italic}
          tooltip="Italic"
          onClick={() => executeCommand('italic')}
        />
        <ToolbarButton
          command="underline"
          icon={Underline}
          tooltip="Underline"
          onClick={() => executeCommand('underline')}
        />
        <div className="w-px h-6 bg-[#444444] mx-2"></div>
        <ToolbarButton
          command="alignLeft"
          icon={AlignLeft}
          tooltip="Align Left"
          onClick={() => insertAtCursor('\n<div style="text-align: left;">\n\n</div>\n')}
        />
        <ToolbarButton
          command="alignCenter"
          icon={AlignCenter}
          tooltip="Align Center"
          onClick={() => insertAtCursor('\n<div style="text-align: center;">\n\n</div>\n')}
        />
        <ToolbarButton
          command="alignRight"
          icon={AlignRight}
          tooltip="Align Right"
          onClick={() => insertAtCursor('\n<div style="text-align: right;">\n\n</div>\n')}
        />
        <div className="w-px h-6 bg-[#444444] mx-2"></div>
        <ToolbarButton
          command="list"
          icon={List}
          tooltip="Bullet List"
          onClick={() => executeCommand('list')}
        />
        <ToolbarButton
          command="link"
          icon={Link}
          tooltip="Insert Link"
          onClick={() => executeCommand('link')}
        />
        <ToolbarButton
          command="image"
          icon={Image}
          tooltip="Insert Image"
          onClick={() => executeCommand('image')}
        />
        <ToolbarButton
          command="code"
          icon={Code}
          tooltip="Code"
          onClick={() => executeCommand('code')}
        />
        <div className="flex-1"></div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Type className="w-3 h-3" />
          <span>Rich Text</span>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-4 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200 resize-none font-mono ${
            isFocused ? 'ring-2 ring-[#FF8C42]' : ''
          }`}
        />
        
        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          {value.length} characters
        </div>
      </div>

      {/* Quick insert buttons */}
      <div className="p-2 bg-[#222222] border-t border-[#444444]">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Quick insert:</span>
          <button
            type="button"
            onClick={() => insertAtCursor('<h1>Heading 1</h1>')}
            className="px-2 py-1 text-xs bg-[#333333] hover:bg-[#444444] text-gray-300 rounded transition-colors"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('<h2>Heading 2</h2>')}
            className="px-2 py-1 text-xs bg-[#333333] hover:bg-[#444444] text-gray-300 rounded transition-colors"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('<p>Paragraph text</p>')}
            className="px-2 py-1 text-xs bg-[#333333] hover:bg-[#444444] text-gray-300 rounded transition-colors"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('<br><br>')}
            className="px-2 py-1 text-xs bg-[#333333] hover:bg-[#444444] text-gray-300 rounded transition-colors"
          >
            Break
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor('<hr>')}
            className="px-2 py-1 text-xs bg-[#333333] hover:bg-[#444444] text-gray-300 rounded transition-colors"
          >
            Line
          </button>
        </div>
      </div>
    </div>
  )
}

export default RichTextEditor
