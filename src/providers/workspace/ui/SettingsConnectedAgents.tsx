import React from 'react';
import { ConnectedAgents } from '../../../components/connected-agents';

/**
 * Settings-screen wrapper around the public <ConnectedAgents /> component.
 * The settings dialog renders the screen title, so the component's own is hidden.
 */
const WorkspaceSettingsConnectedAgents: React.FC = () => {
  return <ConnectedAgents title={null} />;
};

export default WorkspaceSettingsConnectedAgents;
