import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { getSettings } from '../../db/queries'
import { customUploaderResponseSchema } from '../schemas'

const customUploader = new Hono<{ Variables: Variables }>()

customUploader.post('/', async (c) => {
  const formData = await c.req.formData()

  const settings = await getSettings()
  if (!('fileUploadEndpoint' in settings) || !settings.fileUploadEndpoint) {
    return c.text('File Upload Endpoint is missing', 404)
  }

  const response = await fetch(settings.fileUploadEndpoint, {
    method: 'POST',
    body: formData
  })
  const data = await response.json()
  const result = customUploaderResponseSchema.safeParse(data)

  if (result.success) {
    return c.json(result.data)
  } else {
    return c.text('Failed to upload files from your own endpoint.', 400)
  }
})

export default customUploader
