import { ShieldAlert } from 'lucide-react';
import React from 'react';
import { useTranslation, type TranslationKey } from '../../../i18n';

interface NoPermissionProps {
  /** Override the default title translation key */
  titleKey?: TranslationKey;
  /** Override the default description translation key */
  descriptionKey?: TranslationKey;
}

const NoPermission: React.FC<NoPermissionProps> = ({ titleKey, descriptionKey }) => {
  const { t } = useTranslation();

  return (
    <div className="border border-warning/20 bg-warning/10 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-warning">
            {t(titleKey ?? 'settings.common.noPermissionTitle')}
          </h4>
          <p className="text-xs text-warning/80 mt-1">
            {t(descriptionKey ?? 'settings.common.noPermissionDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoPermission;
