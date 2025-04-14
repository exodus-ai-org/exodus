import { Chat } from '@/components/chat'
import { v4 as uuidV4 } from 'uuid'

export function Home() {
  return (
    <>
      <div className="mx-auto flex size-full max-w-3xl flex-col justify-center px-8 md:mt-20">
        <p className="animate-bounce text-2xl font-semibold">Hello there!</p>
        <p className="text-2xl text-zinc-500">How can I help you today?</p>
      </div>
      <Chat id={uuidV4()} initialMessages={[]} />
    </>
  )
}
