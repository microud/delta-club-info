import { ContentSection } from '../components/content-section'
import { AiConfigForm } from './ai-config-form'

export function SettingsAi() {
  return (
    <ContentSection
      title='AI 配置'
      desc='配置 AI 模型连接参数，用于智能分析和内容处理。'
    >
      <AiConfigForm />
    </ContentSection>
  )
}
