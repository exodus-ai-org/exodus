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

  it('has the composer, attachment, and uploader keys', () => {
    expect(philharmonic.chat.attachmentPreview.removeAria).toBe(
      'Remove {{name}}'
    )
    expect(philharmonic.chat.uploader.attachAria).toBe('Attach images')
    expect(philharmonic.chat.composer.placeholder).toBe('Message your team…')
  })

  it('has the plan card elapsed/status/aria keys', () => {
    expect(philharmonic.chat.planCard.elapsed).toMatchObject({
      lessThanMin: '<1 min',
      minutes: '{{count}} min',
      hoursMinutes: '{{hours}}h {{minutes}}m'
    })
    expect(philharmonic.chat.planCard.status).toMatchObject({
      active: 'active',
      done: 'done',
      aborted: 'aborted',
      draft: 'draft'
    })
    expect(philharmonic.chat.planCard.stepStatusAria).toMatchObject({
      pending: 'Pending',
      running: 'Running',
      done: 'Done',
      skipped: 'Skipped',
      failed: 'Failed'
    })
  })

  it('has the shared role-name keys', () => {
    expect(philharmonic.chat.roles).toMatchObject({
      pm: 'PM',
      employeeFallback: 'Employee'
    })
  })
})

describe('philharmonic namespace chat.composer.hint renders correctly via Trans', () => {
  it('hint — two <kbd> elements at indices 1 and 4, correct positions', async () => {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { I18nextProvider, initReactI18next } = await import('react-i18next')
    const i18next = (await import('i18next')).default
    const { ComposerHint } =
      await import('@/components/philharmonic/chat/composer')

    const i18n = i18next.createInstance()
    await i18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { philharmonic } },
      ns: ['philharmonic'],
      defaultNS: 'philharmonic',
      interpolation: { escapeValue: false }
    })

    const html = renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(ComposerHint))
    )
    expect(html).toBe(
      '<p class="text-muted-foreground mt-1.5 px-1 text-[10px]">Press <kbd class="bg-background rounded px-1 py-px">Enter</kbd> to send, <kbd class="bg-background ml-1 rounded px-1 py-px">Shift + Enter</kbd> for a new line. Paste or attach images.</p>'
    )
  })
})
