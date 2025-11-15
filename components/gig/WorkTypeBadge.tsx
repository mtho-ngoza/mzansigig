interface WorkTypeBadgeProps {
  workType: 'remote' | 'physical' | 'hybrid'
  size?: 'sm' | 'md' | 'lg'
}

export function WorkTypeBadge({ workType, size = 'sm' }: WorkTypeBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  }

  const workTypeConfig = {
    remote: {
      label: 'Remote',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '💻'
    },
    physical: {
      label: 'Physical',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '📍'
    },
    hybrid: {
      label: 'Hybrid',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      icon: '🔄'
    }
  }

  const config = workTypeConfig[workType]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
      title={`${config.label} work`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}
