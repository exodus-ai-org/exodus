import { useTheme } from '@/components/theme-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atomOneDark,
  atomOneLight
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { UseFormReturnType } from '../settings-form'

export function FileUploadEndpoint({ form }: { form: UseFormReturnType }) {
  const { actualTheme } = useTheme()

  return (
    <>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="inline">
          By default, Exodus encodes uploaded attachments into{' '}
          <strong>base64</strong> for prompt integration. To use your own upload
          API, configure it here. Verify that the generated image URLs are
          reachable by the models.
          <Tabs defaultValue="request" className="mt-2 w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>
            <TabsContent value="request">
              <Card className="rounded-md p-0">
                <SyntaxHighlighter
                  PreTag="div"
                  language="typescript"
                  style={actualTheme === 'dark' ? atomOneDark : atomOneLight}
                  customStyle={{
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem'
                  }}
                >
                  {'// method POST\n\n' +
                    'const files = e.target.files\n' +
                    'const formData = new FormData()\n\n' +
                    '// retrieve `files` from FormData\n' +
                    '// and upload them to your own bucket like S3.\n' +
                    "formData.append('files', files) "}
                </SyntaxHighlighter>
              </Card>
            </TabsContent>
            <TabsContent value="response">
              <Card className="rounded-md p-0">
                <SyntaxHighlighter
                  PreTag="div"
                  language="json"
                  style={actualTheme === 'dark' ? atomOneDark : atomOneLight}
                  customStyle={{
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem'
                  }}
                >
                  {'// Your response JSON should be like:\n\n' +
                    '[\n' +
                    '  {\n' +
                    '    "name": "fakeimg.jpg",\n' +
                    '    "url": "e.g. https://fakeimg.pl/300/",\n' +
                    '    "contentType": "image/jpg"\n' +
                    '  },\n' +
                    '  ...\n' +
                    ']'}
                </SyntaxHighlighter>
              </Card>
            </TabsContent>
          </Tabs>
        </AlertDescription>
      </Alert>
      <FormField
        control={form.control}
        name="fileUploadEndpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endpoint</FormLabel>
            <FormControl>
              <Input
                type="text"
                id="file-upload-endpoint-input"
                placeholder="https://api.your-domain.com/upload"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
