import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { fetcher, getHttpErrorMessage } from '@shared/utils/http'
import { AlertCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { sileo } from 'sileo'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { SettingsRow, SettingsSection } from '../settings-row'

export function Search({ form }: { form: UseFormReturnType }) {
  const [isTesting, setIsTesting] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      await fetcher('/api/settings/search/test-connection', {
        method: 'POST'
      })
      sileo.success({ title: 'Connected to Elasticsearch' })
    } catch (err) {
      sileo.error({
        title: 'Failed to connect to Elasticsearch',
        description: getHttpErrorMessage(err)
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleReindex = async () => {
    setIsReindexing(true)
    try {
      const result = await fetcher<{ count: number }>(
        '/api/settings/search/reindex',
        { method: 'POST' }
      )
      sileo.success({ title: `Reindexed ${result.count} messages` })
    } catch (err) {
      sileo.error({
        title: 'Failed to reindex messages',
        description: getHttpErrorMessage(err)
      })
    } finally {
      setIsReindexing(false)
    }
  }

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Exodus's built-in search works across all languages, including
          Chinese, Japanese, and Korean —{' '}
          <strong>it matches exact text, not "smart" results</strong>: no
          relevance ranking, no typo tolerance, no stemming (searching "run"
          won't find "running"). Configure a self-hosted or cloud Elasticsearch
          cluster below for better relevance ranking and real word segmentation.
          This is optional; leave the URL empty to keep using the built-in
          search. Exodus only reads and writes documents to your cluster's index
          — for real word-level Chinese segmentation (rather than
          character-level), configure a language-aware analyzer (e.g.{' '}
          <code>ik</code>, <code>smartcn</code>, or the built-in{' '}
          <code>cjk</code>) on your cluster before pointing Exodus at it.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <Controller
          control={form.control}
          name="search.elasticsearch.url"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Elasticsearch URL"
              description="Leave empty to use the built-in PGlite full-text search."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                placeholder="https://localhost:9200"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="search.elasticsearch.username"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Username"
              description="Optional — required only if your cluster has security enabled."
              error={fieldState.error}
              layout="vertical"
            >
              <Input {...field} value={field.value ?? ''} />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="search.elasticsearch.password"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Password"
              description="Optional — required only if your cluster has security enabled."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="password"
                autoComplete="current-password"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="search.elasticsearch.indexName"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Index Name"
              description='Defaults to "exodus-messages" if left empty.'
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                placeholder="exodus-messages"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />

        <SettingsRow
          label="Connection"
          description="Test connectivity, or reindex all existing chat history into Elasticsearch."
          layout="vertical"
        >
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isTesting}
              onClick={handleTestConnection}
              data-testid={TEST_IDS.search.testConnectionButton}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isReindexing}
              onClick={handleReindex}
              data-testid={TEST_IDS.search.reindexButton}
            >
              {isReindexing ? 'Reindexing...' : 'Reindex History'}
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
