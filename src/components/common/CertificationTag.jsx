import { Award, ImageIcon } from 'lucide-react'

const CertificationTag = ({
  cert,
  onClick,
  size = 'sm',
  className = ''
}) => {
  const hasImage = !!cert.imageId

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
  }

  const iconSize = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }

  return (
    <span
      onClick={hasImage && onClick ? () => onClick(cert) : undefined}
      className={`inline-flex items-center bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 ${sizeClasses[size]} ${hasImage ? 'cursor-pointer hover:bg-amber-500/20 hover:border-amber-500/40 transition-colors' : ''} ${className}`}
    >
      <Award className={`${iconSize[size]} mr-1`} />
      {cert.name}
      {hasImage && <ImageIcon className={`${iconSize[size]} ml-1 opacity-50`} />}
    </span>
  )
}

export default CertificationTag
