import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const philharmonic = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'shared',
      'i18n',
      'locales',
      'en',
      'philharmonic.json'
    ),
    'utf8'
  )
)

describe('philharmonic namespace (en)', () => {
  it('has the container toast keys', () => {
    expect(philharmonic.container.toast).toMatchObject({
      groupDeleted: 'Group deleted',
      deleteGroupFailed: 'Could not delete the group'
    })
  })

  it('has the container tab keys', () => {
    expect(philharmonic.container.tabs).toMatchObject({
      costs: 'Costs',
      schedule: 'Schedule'
    })
  })

  it('has the no-group-selected empty state keys', () => {
    expect(philharmonic.container.noGroupSelected).toMatchObject({
      title: 'No group selected',
      description:
        'Pick a group from the left, or start a new one to message your virtual team.',
      createButton: 'Create a group'
    })
  })

  it('has the new-group default title', () => {
    expect(philharmonic.container.newGroupDefaultTitle).toBe('New group')
  })
})
