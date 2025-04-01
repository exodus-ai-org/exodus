import { useAudio } from '@/hooks/use-audio'
import { cn } from '@/lib/utils'
import { CircleStop, Loader, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconWrapper, MessageActionItem } from './massage-action'

export function AudioPlayer({ content }: { content: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { loading, result, textToSpeech } = useAudio()

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

  const fetchSpeech = () => {
    if (!result) {
      textToSpeech(content)
    } else {
      playAudio()
    }
  }

  useEffect(() => {
    if (result) {
      playAudio()
    }
  }, [result])

  return (
    <MessageActionItem tooltipContent={isPlaying ? 'Stop' : 'Read aloud'}>
      <span>
        {!(loading || isPlaying) && (
          <IconWrapper>
            <Volume2 size={14} onClick={fetchSpeech} />
          </IconWrapper>
        )}

        {loading && (
          <IconWrapper>
            <Loader size={14} className={cn('animate-spin')} />
          </IconWrapper>
        )}

        {isPlaying && (
          <IconWrapper>
            <CircleStop size={14} onClick={handleStop} />
          </IconWrapper>
        )}

        {result && (
          <audio
            src={result}
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
