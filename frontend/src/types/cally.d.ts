/**
 * Cally日历组件的类型声明
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'calendar-date': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string
        onchange?: (event: Event) => void
      }
      'calendar-month': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
    
    interface HTMLAttributes<T> extends React.AriaAttributes, React.DOMAttributes<T> {
      // Popover API
      popover?: 'auto' | 'manual' | ''
      popovertarget?: string
      popovertargetaction?: 'show' | 'hide' | 'toggle'
      // CSS Anchor Positioning  
      anchorName?: string
      positionAnchor?: string
    }
  }
}

declare module 'cally' {
  // Cally模块的类型声明
}

export {}