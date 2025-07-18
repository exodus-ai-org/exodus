import { useAudio } from '@/hooks/use-audio'
import { AudioLines, CircleStop, Loader } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'

export function AudioRecorder({
  input,
  setInput
}: {
  input: string
  setInput: (input: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  // const [audioUrl, setAudioUrl] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { data, loading, speechToText } = useAudio()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      mediaRecorderRef.current.start()
      setIsRecording(true)

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/wav'
        })
        speechToText(audioBlob as File)

        // const audioUrl = URL.createObjectURL(audioBlob)
        // setAudioUrl(audioUrl)
        audioChunksRef.current = []
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'An error occurred, please try again!'
      )
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  useEffect(() => {
    if (data) {
      setInput(input + data)
    }
  }, [data, input, setInput])

  return (
    <Button
      type="submit"
      variant="secondary"
      onClick={isRecording ? stopRecording : startRecording}
    >
      {loading ? (
        <Loader className="animate-spin" />
      ) : isRecording ? (
        <CircleStop />
      ) : (
        <AudioLines />
      )}

      {/* {
        // The audio element is just for test.
        audioUrl && (
          <audio controls>
            <source src={audioUrl} type="audio/mp3" />
            Your browser does not support the audio element.
          </audio>
        )
      } */}
    </Button>
  )
}
