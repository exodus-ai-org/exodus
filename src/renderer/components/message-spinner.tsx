export function MessageSpinner() {
  return (
    <div className="flex animate-pulse items-center justify-start gap-2 p-2">
      <div className="size-2 rounded-full bg-blue-400"></div>
      <div className="size-2 rounded-full bg-green-400"></div>
      <div className="bg-foreground size-2 rounded-full"></div>
    </div>
  )
}
