import React, { useEffect, useState } from 'react';
import '../styles/global.css';

const ProfileSelection: React.FC = () => {
  const [profiles, setProfiles] = useState<
    { id: string; name: string; color: string }[] | null
  >(null);
  const [createProfileModalOpen, setCreateProfileModalOpen] = useState(false);
  const [createProfileName, setCreateProfileName] = useState('');

  const getProfiles = async () => {
    const profiles = await (window as any).electronAPI.getAllProfiles();
    setProfiles(Object.values(profiles || {}));
  };
  useEffect(() => {
    getProfiles();
  }, []);

  const showCreateProfileModal = () => {
    if (!createProfileModalOpen) return null;
    return (
      <div className="modal">
        <div className="modal-content">
          <input
            className="modal-input"
            type="text"
            autoFocus
            placeholder="Enter Profile Name"
            onChange={e => setCreateProfileName(e.target.value)}
          />
          <div className="modal-button-container">
            <button
              className="cancel-button"
              onClick={() => {
                setCreateProfileModalOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              className={`modal-button ${createProfileName.length <= 3 ? 'disabled' : 'enabled'}`}
              disabled={createProfileName.length <= 3}
              onClick={() => {
                (window as any).electronAPI.createProfile(
                  new Date().getTime().toString(),
                  createProfileName
                );
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div>
      <div className="profile-selection-header">
        <h1>Select a profile to continue</h1>
        <button
          className="create-profile-button"
          onClick={() => {
            setCreateProfileModalOpen(true);
          }}
        >
          Create Profile
        </button>
      </div>

      <div className="profile-selection-container">
        <div className="profile-list">
          {profiles && profiles.length >= 0 ? (
            profiles.map((profile, index) => (
              <div key={profile.id + index} className="profile-item">
                <div
                  onClick={() => {
                    (window as any).electronAPI.setActiveProfile(profile.id);
                  }}
                >
                  <p
                    style={{
                      backgroundColor: profile.color,
                    }}
                    className="profile-item-avatar"
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </p>
                  <div>{profile.name}</div>
                </div>
                <button
                  className="delete-profile-button"
                  onClick={async (
                    event: React.MouseEvent<HTMLButtonElement>
                  ) => {
                    await (window as any).electronAPI.deleteProfile(profile.id);
                    getProfiles();
                    event.stopPropagation();
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div>Loading profiles...</div>
          )}
          {showCreateProfileModal()}
        </div>
      </div>
    </div>
  );
};

export default ProfileSelection;
