import React from 'react';

export interface SubscriptionNoticeBannerProps {
  /** Container classes (background, border, padding) — passed verbatim per call site. */
  className: string;
  icon: React.ReactNode;
  titleClassName: string;
  title: React.ReactNode;
  descriptionClassName: string;
  description: React.ReactNode;
  /** Optional extra content rendered after the description (e.g. an action button). */
  children?: React.ReactNode;
}

export const SubscriptionNoticeBanner: React.FC<SubscriptionNoticeBannerProps> = ({
  className,
  icon,
  titleClassName,
  title,
  descriptionClassName,
  description,
  children,
}) => (
  <div className={className}>
    <div className="flex items-start gap-3">
      {icon}
      <div>
        <p className={titleClassName}>{title}</p>
        <p className={descriptionClassName}>{description}</p>
        {children}
      </div>
    </div>
  </div>
);
