// 通用卡片組件

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlighted' | 'minimal';
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  actions,
  className = '',
  variant = 'default',
  onClick,
}) => {
  const baseClasses = 'rounded-xl border transition-all duration-200';

  const variantClasses = {
    default: 'bg-white border-gray-200 shadow-sm hover:shadow-md',
    highlighted: 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md',
    minimal: 'bg-gray-50 border-gray-100'
  };

  const cardClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <div className={cardClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {(title || subtitle || icon || actions) && (
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="p-2 bg-blue-100 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="p-6 pt-2">
        {children}
      </div>
    </div>
  );
};