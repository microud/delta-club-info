import { ContentSection } from '../components/content-section'
import { TikHubSection } from './tikhub-section'

export default function SystemSettings() {
  return (
    <ContentSection>
      <div className='space-y-8'>
        <section>
          <h3 className='text-lg font-medium'>TikHub</h3>
          <p className='text-muted-foreground text-sm'>
            配置 TikHub API 访问参数，用于多平台数据采集。
          </p>
          <div className='mt-4'>
            <TikHubSection />
          </div>
        </section>
      </div>
    </ContentSection>
  )
}
