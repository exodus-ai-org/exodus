import MonacoEditor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { useRef } from 'react'
import { useController, UseControllerProps } from 'react-hook-form'
import { useTheme } from './theme-provider'

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

export function CodeEditor(props: UseControllerProps) {
  const { theme } = useTheme()
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const { field } = useController(props)

  const handleEditorChange = (value?: string) => {
    field.onChange(value)
  }

  const defineTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'shadcn-dark'
        : 'light'
    }

    return theme === 'dark' ? 'shadcn-dark' : 'light'
  }
  return (
    <MonacoEditor
      theme={defineTheme()}
      defaultLanguage="json"
      value={field.value}
      onChange={handleEditorChange}
      onMount={(editor) => (editorRef.current = editor)}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('shadcn-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': '#000000'
          }
        })
      }}
    />
  )
}
