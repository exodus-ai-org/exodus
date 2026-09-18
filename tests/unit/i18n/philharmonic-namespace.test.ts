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

  it('has the schedule tab and shared keys', () => {
    expect(philharmonic.schedule.tab).toMatchObject({
      heading: 'Schedule',
      upcomingTrigger: 'Upcoming',
      recurringTrigger: 'Recurring'
    })
    expect(philharmonic.schedule.unknownGroup).toBe('Unknown group')
    expect(philharmonic.schedule.scheduleTaskButton).toBe('Schedule task')
  })

  it('has the task card status and priority labels', () => {
    expect(philharmonic.schedule.taskCard.status).toMatchObject({
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      waiting_for_user: 'Waiting'
    })
    expect(philharmonic.schedule.taskCard.priority).toMatchObject({
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent'
    })
  })

  it('has the recurring-list schedule-description interpolation keys', () => {
    expect(philharmonic.schedule.recurringList).toMatchObject({
      lastRun: 'last {{time}}',
      nextRun: 'next {{time}}'
    })
  })

  it('has the schedule form keys', () => {
    expect(philharmonic.schedule.form.title).toBe('Schedule a task')
    expect(philharmonic.schedule.form.cronPresets).toMatchObject({
      dailyNine: 'Every day at 9:00 AM',
      mondayNine: 'Every Monday at 9:00 AM',
      custom: 'Custom'
    })
  })
})
