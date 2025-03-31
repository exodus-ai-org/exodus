import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { useTheme } from '../theme-provider'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

loader.config({ monaco })

export function JsonEditor() {
  const { theme } = useTheme()

  const defineTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'vs-dark'
        : 'light'
    }

    return theme === 'dark' ? 'vs-dark' : 'light'
  }
  return (
    <Editor
      theme={defineTheme()}
      defaultLanguage="json"
      defaultValue={`{\n  "mcpServers": {\n    "obsidian-mcp": {\n      "command": "node",\n      "args": [\n        "/Users/bytedance/code/obsidian-mcp/build/index.js",\n        "/Users/bytedance/Library/Mobile\\\\ Documents/iCloud~md~obsidian/Documents/YanceyOfficial"\n      ]\n    }\n  }\n}`}
    />
  )
}
