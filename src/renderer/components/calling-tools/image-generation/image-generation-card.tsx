import { useTranslation } from 'react-i18next'

import { ImageGeneration } from '@/components/image-generation'

interface GeneratedImage {
  url: string
  revisedPrompt?: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
}

export function ImageGenerationCard({
  toolResult
}: {
  toolResult: ImageGenerationResult
}) {
  const { t } = useTranslation('chat')
  const images = toolResult.images ?? []
  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((image, i) => (
        <ImageGeneration
          // react-doctor/no-array-index-as-key: suppressed — generated
          // images have no stable id of their own; url can repeat across
          // OpenAI responses for identical prompts within the same batch.
          key={`${image.url}-${i}`}
          status="complete"
          prompt={image.revisedPrompt}
        >
          <img
            src={image.url}
            alt={image.revisedPrompt || t('imageGeneration.generatedImageAlt')}
          />
        </ImageGeneration>
      ))}
    </div>
  )
}
