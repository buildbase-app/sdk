import React, { useState, useEffect } from 'react';
import { IWorkspace } from '../types';

const WorkspaceSettingsGeneral: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setImage(workspace.image || '');
    }
  }, [workspace]);

  if (!workspace) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Workspace Settings</h2>
        <div className="text-gray-500">Loading workspace settings...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Workspace Settings</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={name}
          disabled
          placeholder="Enter workspace name"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Icon</label>
        <div className="border border-border rounded-lg p-2 max-w-16 max-h-16">
          <img src={workspace.image} alt={workspace.name} className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Workspace ID</label>
        <input
          className="w-full border rounded px-3 py-2 bg-gray-100"
          value={workspace.workspaceId}
          readOnly
        />
        <div className="text-xs text-gray-500 mt-1">
          This is the unique identifier for your workspace.
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettingsGeneral;
