import { describe, expect, it } from 'vitest'

import { parsePhilharmonicPath } from '@/layouts/philharmonic-layout'

describe('parsePhilharmonicPath', () => {
  it('reads the page and the group from the path', () => {
    expect(parsePhilharmonicPath('/philharmonic')).toEqual({
      page: 'chat',
      groupId: null
    })
    expect(parsePhilharmonicPath('/philharmonic/groups/abc')).toEqual({
      page: 'chat',
      groupId: 'abc'
    })
    expect(parsePhilharmonicPath('/philharmonic/workforce')).toEqual({
      page: 'workforce',
      groupId: null
    })
    expect(parsePhilharmonicPath('/philharmonic/dashboard')).toEqual({
      page: 'dashboard',
      groupId: null
    })
  })

  it('treats anything else as the groups page with none chosen', () => {
    expect(parsePhilharmonicPath('/philharmonic/groups')).toEqual({
      page: 'chat',
      groupId: null
    })
    expect(parsePhilharmonicPath('/philharmonic/nonsense')).toEqual({
      page: 'chat',
      groupId: null
    })
  })
})
