import './styles/app.css'
import { useSajuApp } from './hooks/useSajuApp'
import Toast from './components/ui/Toast'
import HistorySidebar from './components/history/HistorySidebar'
import ReadingContextMenu from './components/history/ReadingContextMenu'
import SajuWorkspace from './components/workspace/SajuWorkspace'
import ProfileModal from './components/profile/ProfileModal'

function App() {
  const app = useSajuApp()

  return (
    <main className="page">
      <Toast message={app.statusMessage} leaving={app.toastLeaving} />

      <HistorySidebar
        user={app.user}
        userLabel={app.userLabel}
        userAvatar={app.userAvatar}
        profile={app.profile}
        profileLoading={app.profileLoading}
        authBusy={app.authBusy}
        authLoading={app.authLoading}
        isBusy={app.isBusy}
        isHistoryLoading={app.isHistoryLoading}
        readings={app.readings}
        selectedId={app.selectedId}
        onEditProfile={app.openProfileEdit}
        onLogout={app.handleLogout}
        onLogin={app.handleGoogleLogin}
        onNewSaju={app.handleNewSaju}
        onSelectReading={(reading) => {
          app.setContextMenu(null)
          app.handleSelectReading(reading)
        }}
        onReadingContextMenu={app.handleReadingContextMenu}
      />

      <ReadingContextMenu
        contextMenu={app.contextMenu}
        isBusy={app.isBusy}
        onDelete={app.handleDeleteReading}
      />

      <SajuWorkspace {...app} />

      <ProfileModal
        open={app.profileModal === 'setup' || app.profileModal === 'edit'}
        mode={app.profileModal === 'edit' ? 'edit' : 'setup'}
        initialValues={app.profileFormValues}
        isSaving={app.isSavingProfile}
        errorMessage={app.profileError}
        onSave={app.handleSaveProfile}
        onClose={app.closeProfileModal}
      />
    </main>
  )
}

export default App
