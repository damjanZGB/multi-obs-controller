import {
  Alert,
  AlertIcon,
  Box,
  Container,
  Heading,
  Skeleton,
  Stack,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useState } from 'react';
import type { SettingsPayload } from '@control-center/shared';
import ControlBar from './components/ControlBar';
import TelemetryGrid from './components/TelemetryGrid';
import SettingsDrawer from './components/SettingsDrawer';
import LogPanel from './components/LogPanel';
import { useTelemetry } from './hooks/useTelemetry';
import { useSettings } from './hooks/useSettings';
import { useLogs } from './hooks/useLogs';
import { muteAll, setSceneAll } from './api/client';

const App = () => {
  const { telemetry, connected } = useTelemetry();
  const { connections, global, loading, error, save } = useSettings();
  const logs = useLogs();
  const [commandIssues, setCommandIssues] = useState<Map<number, { reason: string; timestamp: number }>>(() => new Map());
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [mutingState, setMutingState] = useState<string>();
  const [savingSettings, setSavingSettings] = useState(false);
  const toast = useToast();

  const handleMute = async (muted: boolean) => {
    setMutingState(muted ? 'mute' : 'unmute');
    try {
      const result = await muteAll(muted);
      const failures = result.failed.length;
      toast({
        status: failures ? 'warning' : 'success',
        title: muted ? 'Mute command sent' : 'Unmute command sent',
        description: failures
          ? `${failures} instances reported issues.`
          : `${result.success.length} instances updated.`,
        isClosable: true
      });
      setCommandIssues((prev) => {
        const next = new Map(prev);
        const timestamp = Date.now();
        result.failed.forEach(({ id, reason }) => {
          next.set(id, { reason, timestamp });
        });
        result.success.forEach((id) => {
          next.delete(id);
        });
        return next;
      });
    }
    catch (err) {
      toast({
        status: 'error',
        title: 'Command failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        isClosable: true
      });
    }
    finally {
      setMutingState(undefined);
    }
  };

  const handleScene = async (sceneName: string) => {
    setMutingState(sceneName);
    try {
      const result = await setSceneAll({ sceneName });
      const failures = result.failed.length;
      toast({
        status: failures ? 'warning' : 'success',
        title: `Scene ${sceneName} applied`,
        description: failures
          ? `${failures} instances failed. Check logs and connectivity.`
          : `${result.success.length} instances updated.`,
        isClosable: true
      });
      setCommandIssues((prev) => {
        const next = new Map(prev);
        const timestamp = Date.now();
        result.failed.forEach(({ id, reason }) => {
          next.set(id, { reason, timestamp });
        });
        result.success.forEach((id) => {
          next.delete(id);
        });
        return next;
      });
    }
    catch (err) {
      toast({
        status: 'error',
        title: 'Failed to set scene',
        description: err instanceof Error ? err.message : 'Unknown error',
        isClosable: true
      });
    }
    finally {
      setMutingState(undefined);
    }
  };

  const handleSaveSettings = async (payload: SettingsPayload) => {
    setSavingSettings(true);
    try {
      await save(payload);
      toast({
        status: 'success',
        title: 'Settings saved',
        isClosable: true
      });
    }
    catch (err) {
      toast({
        status: 'error',
        title: 'Failed to save settings',
        description: err instanceof Error ? err.message : 'Unknown error',
        isClosable: true
      });
      throw err;
    }
    finally {
      setSavingSettings(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.900" color="gray.100" py={10}>
      <Container maxW="7xl">
        <Stack spacing={6}>
          <Heading size="lg">Multi OBS Control Center</Heading>

          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {loading && !connections.length && (
            <Stack spacing={4}>
              <Skeleton height="60px" borderRadius="lg" />
              <Skeleton height="240px" borderRadius="lg" />
            </Stack>
          )}

          <ControlBar
            scenePresets={global.scenePresets}
            onMute={async () => { await handleMute(true); }}
            onUnmute={async () => { await handleMute(false); }}
            onSetScene={async (scene) => { await handleScene(scene); }}
            loadingCommand={mutingState}
            telemetryConnected={connected}
            onOpenSettings={onOpen}
          />

          <TelemetryGrid telemetry={telemetry} issues={commandIssues} />

          <Box>
            <Heading size="md" mb={3}>
              Live Activity
            </Heading>
            <LogPanel logs={logs} />
          </Box>

          <SettingsDrawer
            isOpen={isOpen}
            onClose={onClose}
            connections={connections}
            global={global}
            onSubmit={handleSaveSettings}
            submitting={savingSettings}
          />
        </Stack>
      </Container>
    </Box>
  );
};

export default App;
