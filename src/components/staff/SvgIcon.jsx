import React from 'react'

const SvgIcon = ({ path, className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d={path} />
  </svg>
)

export default SvgIcon