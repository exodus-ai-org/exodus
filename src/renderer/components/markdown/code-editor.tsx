import MonacoEditor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
// monaco-editor 0.56 added an `exports` map (`"./*": "./esm/vs/*.js"`), so the
// worker subpaths lost their `esm/vs/` prefix — the old specifier now resolves
// to a doubled path and fails in both dev and the rolldown build.
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import { useTheme } from 'next-themes'
import { FieldValues, useController, UseControllerProps } from 'react-hook-form'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less')
      return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor')
      return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}
loader.config({ monaco })

const THEME_SETUP = (m: typeof monaco) => {
  m.editor.defineTheme('shadcn-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#000000' }
  })
  m.editor.defineTheme('shadcn-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#f9f9f9',
      'editor.lineHighlightBackground': '#f0f0f0',
      'editorLineNumber.foreground': '#aaaaaa',
      'editor.selectionBackground': '#dbeafe'
    }
  })
}

const DEFAULT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  formatOnPaste: true,
  formatOnType: true,
  minimap: { enabled: false }
}

export type EditorMountHandler = (
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoApi: typeof monaco
) => void

/** Shared editor renderer */
function EditorCore({
  className,
  value,
  onChange,
  options,
  language = 'json',
  onMount
}: {
  className?: string
  value: string
  onChange: (v?: string) => void
  options?: monaco.editor.IStandaloneEditorConstructionOptions
  /** Model language ("json", "sql", …). `options.language` is ignored once a model exists, so it must come through here. */
  language?: string
  /** Access to the editor instance — key bindings, completion providers, focus. */
  onMount?: EditorMountHandler
}) {
  const { resolvedTheme } = useTheme()
  return (
    <MonacoEditor
      className={className}
      theme={resolvedTheme === 'dark' ? 'shadcn-dark' : 'shadcn-light'}
      defaultLanguage={language}
      language={language}
      value={value}
      onChange={onChange}
      onMount={onMount}
      options={{ ...DEFAULT_OPTIONS, ...options }}
      beforeMount={THEME_SETUP}
    />
  )
}

/** react-hook-form controlled mode */
function CodeEditorControlled<T extends FieldValues>({
  props,
  className,
  monacoEditorOption
}: {
  props: UseControllerProps<T>
  className?: string
  monacoEditorOption?: monaco.editor.IStandaloneEditorConstructionOptions
}) {
  const { field } = useController(props)
  return (
    <EditorCore
      className={className}
      value={field.value}
      onChange={(v) => field.onChange(v)}
      options={monacoEditorOption}
    />
  )
}

/** Standalone mode or form mode depending on props */
function CodeEditor<T extends FieldValues>({
  props,
  className,
  monacoEditorOption,
  value,
  onChange
}: {
  props?: UseControllerProps<T>
  className?: string
  monacoEditorOption?: monaco.editor.IStandaloneEditorConstructionOptions
  value?: string
  onChange?: (value: string) => void
}) {
  if (props) {
    return (
      <CodeEditorControlled
        props={props}
        className={className}
        monacoEditorOption={monacoEditorOption}
      />
    )
  }

  return (
    <EditorCore
      className={className}
      value={value ?? ''}
      onChange={(v) => onChange?.(v ?? '')}
      options={monacoEditorOption}
    />
  )
}

/** Non-generic standalone editor for lazy loading */
export function StandaloneCodeEditor({
  className,
  value,
  onChange,
  monacoEditorOption,
  language,
  onMount
}: {
  className?: string
  value?: string
  onChange?: (value: string) => void
  monacoEditorOption?: monaco.editor.IStandaloneEditorConstructionOptions
  language?: string
  onMount?: EditorMountHandler
}) {
  return (
    <EditorCore
      className={className}
      value={value ?? ''}
      onChange={(v) => onChange?.(v ?? '')}
      options={monacoEditorOption}
      language={language}
      onMount={onMount}
    />
  )
}

export default CodeEditor
