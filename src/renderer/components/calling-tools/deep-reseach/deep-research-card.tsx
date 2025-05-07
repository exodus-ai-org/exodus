import { Card, CardContent } from '@/components/ui/card'

export function DeepResearchCard({ toolResult }: { toolResult: string[] }) {
  return (
    <Card className="max-w-96 p-4">
      <CardContent className="p-0">
        <ul className="flex flex-col gap-2">
          {toolResult.map((question, i) => (
            <li key={question} className="text-muted-foreground text-sm">
              {i + 1}. {question}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
