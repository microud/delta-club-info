import { ContentSection } from '../components/content-section'
import { WechatWorkForm } from './wechat-work-form'

export function SettingsWechatWork() {
  return (
    <ContentSection
      title='企业微信'
      desc='配置企业微信应用的连接参数，用于消息推送和通知。'
    >
      <WechatWorkForm />
    </ContentSection>
  )
}
