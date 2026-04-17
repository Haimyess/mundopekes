/**
 * Types compartidos para componentes UI
 */

// Variantes de botones y componentes
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Items de Dropdown
export interface DropdownItem {
  label: string
  icon?: string
  click?: () => void
  disabled?: boolean
  slot?: string
}

// Items de Select
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  icon?: string
}

// Props comunes
export interface BaseComponentProps {
  size?: ComponentSize
  disabled?: boolean
}