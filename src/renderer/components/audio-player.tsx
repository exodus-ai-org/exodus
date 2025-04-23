import { useAudio } from '@/hooks/use-audio'
import { cn } from '@/lib/utils'
import { CircleStop, Loader, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconWrapper, MessageActionItem } from './massage-action'

export function AudioPlayer({ content }: { content: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { data, loading, textToSpeech } = useAudio()

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleEnded = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const fetchSpeech = async () => {
    if (!data) {
      textToSpeech(content)
    } else {
      playAudio()
    }
  }

  useEffect(() => {
    if (data) {
      playAudio()
    }
  }, [data])

  return (
    <MessageActionItem tooltipContent={isPlaying ? 'Stop' : 'Read aloud'}>
      <span>
        {!(loading || isPlaying) && (
          <IconWrapper onClick={fetchSpeech}>
            <Volume2 size={14} strokeWidth={2.5} />
          </IconWrapper>
        )}

        {loading && (
          <IconWrapper>
            <Loader
              size={14}
              strokeWidth={2.5}
              className={cn('animate-spin')}
            />
          </IconWrapper>
        )}

        {isPlaying && (
          <IconWrapper onClick={handleStop}>
            <CircleStop size={14} strokeWidth={2.5} />
          </IconWrapper>
        )}

        {data && (
          <audio
            src={data}
            className="hidden"
            ref={audioRef}
            onEnded={handleEnded}
          />
        )}
      </span>
    </MessageActionItem>
  )
}

export default AudioPlayer
