import { sleep } from 'yancey-js-util'

export async function setSleep({
  timeout
}: {
  controller: ReadableStreamDefaultController
  timeout: number
}) {
  await sleep(timeout)
}
