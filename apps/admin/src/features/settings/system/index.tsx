import { ContentSection } from '../components/content-section'
import { TikHubSection } from './tikhub-section'

export default function SystemSettings() {
  return (
    <div className='space-y-8'>
      <ContentSection
        title='TikHub'
        desc='配置 TikHub API 访问参数，用于多平台数据采集。'
      >
        <TikHubSection />
      </ContentSection>
    </div>
  )
}
