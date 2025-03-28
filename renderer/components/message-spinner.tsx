export function MessageSpinner() {
  return (
    <div className="flex animate-pulse items-center justify-start space-x-2 p-2">
      <div className="h-2 w-2 rounded-full bg-blue-400"></div>
      <div className="h-2 w-2 rounded-full bg-green-400"></div>
      <div className="h-2 w-2 rounded-full bg-black dark:bg-white"></div>
    </div>
  )
}
