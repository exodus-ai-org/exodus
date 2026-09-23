import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { UseFormReturnType } from '@exodus/shared/schemas/settings-schema'
import {
  fetcher,
  getHttpErrorMessage,
  toErrorI18n
} from '@exodus/shared/utils/http'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { SettingsIntro, SwapLabel } from '../settings-kit'
import { SettingsRow, SettingsSection } from '../settings-row'

export function SearchQualityNotice() {
  return (
    <Trans ns="settings" i18nKey="fullTextSearch.alert">
      Exodus's built-in search works across all languages, including Chinese,
      Japanese, and Korean —{' '}
      <strong>it matches exact text, not "smart" results</strong>: no relevance
      ranking, no typo tolerance, no stemming (searching "run" won't find
      "running"). Configure a self-hosted or cloud Elasticsearch cluster below
      for better relevance ranking and real word segmentation. This is optional;
      leave the URL empty to keep using the built-in search. Exodus only reads
      and writes documents to your cluster's index — for real word-level Chinese
      segmentation (rather than character-level), configure a language-aware
      analyzer (e.g. <code>ik</code>, <code>smartcn</code>, or the built-in{' '}
      <code>cjk</code>) on your cluster before pointing Exodus at it.
    </Trans>
  )
}

export function FullTextSearch({ form }: { form: UseFormReturnType }) {
  const { i18n, t } = useTranslation(['errors', 'settings'])
  const [isTesting, setIsTesting] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      await fetcher('/api/v1/settings/full-text-search/test-connection', {
        method: 'POST'
      })
      sileo.success({ title: t('settings:fullTextSearch.toast.connected') })
    } catch (err) {
      sileo.error({
        title: t('settings:fullTextSearch.toast.connectFailed'),
        description: getHttpErrorMessage(err, toErrorI18n(i18n))
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleReindex = async () => {
    setIsReindexing(true)
    try {
      const result = await fetcher<{ count: number }>(
        '/api/v1/settings/full-text-search/reindex',
        { method: 'POST' }
      )
      sileo.success({
        title: t('settings:fullTextSearch.toast.reindexed', {
          count: result.count
        })
      })
    } catch (err) {
      sileo.error({
        title: t('settings:fullTextSearch.toast.reindexFailed'),
        description: getHttpErrorMessage(err, toErrorI18n(i18n))
      })
    } finally {
      setIsReindexing(false)
    }
  }

  return (
    <>
      <SettingsIntro>
        <p>
          <SearchQualityNotice />
        </p>
      </SettingsIntro>

      <SettingsSection>
        <Controller
          control={form.control}
          name="fullTextSearch.elasticsearch.url"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('settings:fullTextSearch.url.label')}
              description={t('settings:fullTextSearch.url.description')}
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
          name="fullTextSearch.elasticsearch.username"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('settings:fullTextSearch.username.label')}
              description={t('settings:fullTextSearch.optionalSecurityHint')}
              error={fieldState.error}
              layout="vertical"
            >
              <Input {...field} value={field.value ?? ''} />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="fullTextSearch.elasticsearch.password"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('settings:fullTextSearch.password.label')}
              description={t('settings:fullTextSearch.optionalSecurityHint')}
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
          name="fullTextSearch.elasticsearch.indexName"
          render={({ field, fieldState }) => (
            <SettingsRow
              label={t('settings:fullTextSearch.indexName.label')}
              description={t('settings:fullTextSearch.indexName.description')}
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
          label={t('settings:fullTextSearch.connection.label')}
          description={t('settings:fullTextSearch.connection.description')}
          layout="vertical"
        >
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isTesting}
              onClick={handleTestConnection}
              data-testid={TEST_IDS.fullTextSearch.testConnectionButton}
            >
              <SwapLabel
                active={isTesting ? 'busy' : 'idle'}
                labels={{
                  idle: t('settings:fullTextSearch.connection.testButton'),
                  busy: (
                    <>
                      <Loader2Icon className="animate-spin" />
                      {t('settings:fullTextSearch.connection.testingLabel')}
                    </>
                  )
                }}
              />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isReindexing}
              onClick={handleReindex}
              data-testid={TEST_IDS.fullTextSearch.reindexButton}
            >
              <SwapLabel
                active={isReindexing ? 'busy' : 'idle'}
                labels={{
                  idle: t('settings:fullTextSearch.connection.reindexButton'),
                  busy: (
                    <>
                      <Loader2Icon className="animate-spin" />
                      {t('settings:fullTextSearch.connection.reindexingLabel')}
                    </>
                  )
                }}
              />
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}
