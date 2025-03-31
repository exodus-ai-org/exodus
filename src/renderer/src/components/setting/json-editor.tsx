import { useState } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

export function JsonEditor() {
  const [jsonValue, setJsonValue] = useState(
    '{\n  "key1": "value1",\n  "key2": 2,\n  "key3": true\n}'
  )
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleJsonChange = (value: string) => {
    setJsonValue(value)
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Unknown Error')
    }
  }
  return (
    <div className="grid gap-4">
      <Textarea
        value={jsonValue}
        onChange={(e) => handleJsonChange(e.target.value)}
        className="text-xs"
        rows={10}
        placeholder="Enter your JSON data here..."
      >
        <div>{jsonValue}</div>
      </Textarea>
      {jsonError && (
        <div className="rounded-md bg-red-100 p-4 text-xs text-red-900">
          <p className="font-medium">JSON Validation Error:</p>
          <p>{jsonError}</p>
        </div>
      )}
      <Button
        onClick={() => {
          try {
            JSON.parse(jsonValue)
            alert('JSON is valid!')
          } catch (error) {
            setJsonError(
              error instanceof Error ? error.message : 'Unknown Error'
            )
          }
        }}
      >
        Validate JSON
      </Button>
    </div>
  )
}
