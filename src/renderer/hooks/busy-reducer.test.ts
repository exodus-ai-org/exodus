// src/renderer/hooks/busy-reducer.test.ts
import { describe, expect, it } from 'vitest'

import { emptyBusyState, PM_KEY, reduceBusy } from './busy-reducer'

const cid = 'c1'

describe('reduceBusy', () => {
  it('marks the PM busy on pm_started and clears on pm_ended', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, { type: 'pm_started', conversationId: cid })
    expect(s.busyAgents.get(PM_KEY)).toBe('orchestrating…')
    s = reduceBusy(s, { type: 'pm_ended', conversationId: cid, reason: 'done' })
    expect(s.busyAgents.has(PM_KEY)).toBe(false)
  })

  it('tracks an employee from message_start through message_end', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'm1',
      role: 'employee',
      agentId: 'a1'
    })
    expect(s.busyAgents.get('a1')).toBe('thinking…')
    s = reduceBusy(s, {
      type: 'message_end',
      conversationId: cid,
      messageId: 'm1'
    })
    expect(s.busyAgents.has('a1')).toBe(false)
  })

  it('uses tool_card to flip the activity label and back', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'm1',
      role: 'employee',
      agentId: 'a1'
    })
    s = reduceBusy(s, {
      type: 'tool_card',
      conversationId: cid,
      messageId: 'm1',
      toolName: 'web_search',
      phase: 'start'
    })
    expect(s.busyAgents.get('a1')).toBe('running web_search…')
    s = reduceBusy(s, {
      type: 'tool_card',
      conversationId: cid,
      messageId: 'm1',
      toolName: 'web_search',
      phase: 'end'
    })
    expect(s.busyAgents.get('a1')).toBe('thinking…')
  })

  it('attributes pm tool cards to the PM sentinel', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, { type: 'pm_started', conversationId: cid })
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'm1',
      role: 'pm'
    })
    s = reduceBusy(s, {
      type: 'tool_card',
      conversationId: cid,
      messageId: 'm1',
      toolName: 'searchKnowledgeBase',
      phase: 'start'
    })
    expect(s.busyAgents.get(PM_KEY)).toBe('running searchKnowledgeBase…')
  })

  it('user and system messages do not mark anyone busy', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'mu',
      role: 'user'
    })
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'ms',
      role: 'system'
    })
    expect(s.busyAgents.size).toBe(0)
  })

  it('keeps an employee busy if a second in-flight message still references them', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'm1',
      role: 'employee',
      agentId: 'a1'
    })
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'm2',
      role: 'employee',
      agentId: 'a1'
    })
    s = reduceBusy(s, {
      type: 'message_end',
      conversationId: cid,
      messageId: 'm1'
    })
    expect(s.busyAgents.has('a1')).toBe(true)
    s = reduceBusy(s, {
      type: 'message_end',
      conversationId: cid,
      messageId: 'm2'
    })
    expect(s.busyAgents.has('a1')).toBe(false)
  })

  it('clears everything on conversation_error', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, { type: 'pm_started', conversationId: cid })
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'm1',
      role: 'employee',
      agentId: 'a1'
    })
    s = reduceBusy(s, {
      type: 'conversation_error',
      conversationId: cid,
      error: 'boom'
    })
    expect(s.busyAgents.size).toBe(0)
    expect(s.messageActor.size).toBe(0)
  })

  it('keeps the PM busy across multiple message starts until pm_ended', () => {
    let s = emptyBusyState()
    s = reduceBusy(s, { type: 'pm_started', conversationId: cid })
    s = reduceBusy(s, {
      type: 'message_start',
      conversationId: cid,
      messageId: 'pm1',
      role: 'pm'
    })
    s = reduceBusy(s, {
      type: 'message_end',
      conversationId: cid,
      messageId: 'pm1'
    })
    expect(s.busyAgents.get(PM_KEY)).toBe('orchestrating…')
    s = reduceBusy(s, { type: 'pm_ended', conversationId: cid, reason: 'done' })
    expect(s.busyAgents.has(PM_KEY)).toBe(false)
  })
})
