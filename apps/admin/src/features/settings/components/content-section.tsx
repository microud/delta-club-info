type ContentSectionProps = {
  title?: string
  desc?: string
  children: React.ReactNode
}

export function ContentSection({ children }: ContentSectionProps) {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        {children}
      </div>
    </div>
  )
}
