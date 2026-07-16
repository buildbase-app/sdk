import React from 'react';
import { Devices } from '../../../components/devices';
import { Sessions } from '../../../components/sessions';
import { useUIVisibility } from '../../../hooks/useUIVisibility';

/**
 * Settings-screen wrapper combining the user's devices and active sessions.
 * The settings dialog renders the screen title, so each section keeps only its
 * own sub-heading (the top device list drops its title to avoid duplication).
 * The sessions block can be hidden via `ui.settings.devices.sessions: false`.
 */
const WorkspaceSettingsDevices: React.FC = () => {
  const { visible } = useUIVisibility();
  const showSessions = visible(ui => ui.settings?.devices?.sessions);
  return (
    <div className="space-y-8">
      <Devices title={null} />
      {showSessions && <Sessions />}
    </div>
  );
};

export default WorkspaceSettingsDevices;
